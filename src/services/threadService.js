import { forkJoin, of, throwError } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { switchMap, catchError } from "rxjs/operators";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_ASSISTANT_ID = import.meta.env.VITE_ASSISTANT_ID ?? "agent";

/* -------------------- Utils -------------------- */

const normalizeBaseUrl = (url) => {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const resolveAssistantId = (value) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_ASSISTANT_ID;

const extractThreadsArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.threads)) return payload.threads;
  return [];
};

/* -------------------- Threads -------------------- */

export async function fetchThreads() {
  if (!API_BASE_URL) {
    console.warn("VITE_API_BASE_URL is not defined.");
    return [];
  }

  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/threads`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch threads: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function fetchThreadById(threadId) {
  if (!threadId) return null;

  try {
    const allThreads = await fetchThreads();
    const list = extractThreadsArray(allThreads);
    const normalizedId = String(threadId);

    return (
      list.find((thread) => {
        if (!thread || typeof thread !== "object") return false;

        const candidates = [
          thread.id,
          thread.thread_id,
          thread.threadId,
          thread?.metadata?.thread_id,
          thread?.metadata?.id,
        ]
          .filter(Boolean)
          .map(String);

        return candidates.includes(normalizedId);
      }) ?? null
    );
  } catch (err) {
    console.warn("Failed to fetch thread by id:", err);
    return null;
  }
}

/* -------------------- Streaming -------------------- */

export async function getStreamMessages({
  url,
  body,
  onChunk,
  onDone,
  onError,
  signal,
}) {
  const res = await fetch(API_BASE_URL + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.body) {
    throw new Error("ReadableStream not supported");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      buffer = parseSSE(buffer, (event, data) => {
        onChunk?.(event, data);
      });
    }

    onDone?.();
  } catch (err) {
    if (err.name !== "AbortError") {
      onError?.(err);
    }
  }
}

function parseSSE(buffer, onEvent) {
  const events = buffer.split("\n\n");
  const incomplete = events.pop();

  for (const event of events) {
    let eventName = "message";
    let data = "";

    for (const line of event.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.replace("event:", "").trim().split("|")[0];
      }
      if (line.startsWith("data:")) {
        data += line.replace("data:", "").trim();
      }
    }

    if (data) {
      try {
        onEvent(eventName, JSON.parse(data));
      } catch {
        // ignore partial chunks
      }
    }
  }

  return incomplete;
}

/* -------------------- Thread Actions -------------------- */

export async function createThread(title, assistantId) {
  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: {
        thread_name: title || "New Thread",
        assistant_id: resolveAssistantId(assistantId),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create thread: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function threadHistory(threadId) {
  if (!threadId) return [];

  const response = await fetch(
    `${normalizeBaseUrl(API_BASE_URL)}/threads/${threadId}/history`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch thread history: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/* -------------------- Stop Stream (RxJS) -------------------- */

export function stopStream(thread_id, run_id, containerId) {
  if (!thread_id || !run_id) {
    return throwError(() => new Error("thread_id and run_id are required"));
  }

  const baseUrl = normalizeBaseUrl(API_BASE_URL);

  // 🔹 Cancel run (independent)
  const cancelRun$ = fromFetch(
    `${baseUrl}/threads/${thread_id}/runs/${run_id}/cancel?wait=0&action=cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  ).pipe(
    switchMap(res => res.ok ? res.json() : Promise.reject(res)),
    catchError(err =>
      of({
        success: false,
        source: "cancelRun",
        error:
          err?.status
            ? `Cancel failed: ${err.status} ${err.statusText}`
            : err?.message ?? err,
      })
    )
  );

  // 🔹 Cleanup container (independent)
  const cleanup$ = containerId
    ? fromFetch(`${baseUrl}/cleanup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ container_id: containerId }),
    }).pipe(
      switchMap(res => res.ok ? res.json() : Promise.reject(res)),
      catchError(err =>
        of({
          success: false,
          source: "cleanup",
          error:
            err?.status
              ? `Cleanup failed: ${err.status} ${err.statusText}`
              : err?.message ?? err,
        })
      )
    )
    : of({
      skipped: true,
      source: "cleanup",
    });

  // 🔹 Run both without dependency
  return forkJoin({
    cancelRun: cancelRun$,
    cleanup: cleanup$,
  });
}

export function cancelRun(thread_id, run_id) {
  if (!thread_id || !run_id) {
    return of({
      success: false,
      source: "cancelRun",
      error: "thread_id and run_id are required",
    });
  }

  const baseUrl = normalizeBaseUrl(API_BASE_URL);

  return fromFetch(
    `${baseUrl}/threads/${thread_id}/runs/${run_id}/cancel?wait=0&action=cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  ).pipe(
    switchMap(res =>
      res.ok
        ? res.json()
        : of({
          success: false,
          source: "cancelRun",
          error: `Cancel failed: ${res.status} ${res.statusText}`,
        })
    ),
    catchError(err =>
      of({
        success: false,
        source: "cancelRun",
        error: err?.message ?? err,
      })
    )
  );
}

export function cleanupContainer(containerId) {
  if (!containerId) {
    return of({
      skipped: true,
      source: "cleanup",
    });
  }

  const baseUrl = normalizeBaseUrl(API_BASE_URL);

  return fromFetch(`${baseUrl}/cleanup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ container_id: containerId }),
  }).pipe(
    switchMap(res =>
      res.ok
        ? res.json()
        : of({
          success: false,
          source: "cleanup",
          error: `Cleanup failed: ${res.status} ${res.statusText}`,
        })
    ),
    catchError(err =>
      of({
        success: false,
        source: "cleanup",
        error: err?.message ?? err,
      })
    )
  );
}


