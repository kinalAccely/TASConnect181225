const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_ASSISTANT_ID = import.meta.env.VITE_ASSISTANT_ID ?? "agent";

const normalizeBaseUrl = (url) => {
  if (!url) {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const resolveAssistantId = (value) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_ASSISTANT_ID;

const extractThreadsArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.threads)) {
    return payload.threads;
  }
  return [];
};

export async function fetchThreads() {
  if (!API_BASE_URL) {
    console.warn("VITE_API_BASE_URL is not defined.");
    return [];
  }

  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/threads`);

  if (!response.ok) {
    throw new Error(`Failed to fetch threads: ${response.status} ${response.statusText}`);
  }

  const threads = await response.json();
  return threads;
}

export async function fetchThreadById(threadId) {
  if (!threadId) {
    return null;
  }

  try {
    const allThreads = await fetchThreads();
    const list = extractThreadsArray(allThreads);
    const normalizedId = String(threadId);
    const match = list.find((thread) => {
      if (!thread || typeof thread !== "object") {
        return false;
      }
      const candidates = [
        thread.id,
        thread.thread_id,
        thread.threadId,
        thread?.metadata?.thread_id,
        thread?.metadata?.id,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value));
      return candidates.includes(normalizedId);
    });
    return match ?? null;
  } catch (error) {
    console.warn("Failed to fetch thread by id:", error);
    return null;
  }
}

export async function getStreamMessages({
  url,
  body,
  onChunk,
  onDone,
  onError,
  signal
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
        eventName = line.replace("event:", "").trim();
      }
      if (line.startsWith("data:")) {
        data += line.replace("data:", "").trim();
      }
    }

    if (data) {
      try {
        onEvent(eventName, JSON.parse(data));
      } catch {
        // partial chunk → wait for next buffer
      }
    }
  }

  return incomplete;
}

export async function createThread(title, assistantId) {
  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "metadata": {
        thread_name: title || "New Thread",
        assistant_id: resolveAssistantId(assistantId),
      }
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create thread: ${response.status} ${response.statusText}`);
  }
  const thread = await response.json();
  return thread;
}

export async function threadHistory(threadId) {
  if (!threadId) {
    return [];
  }

  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/threads/${threadId}/history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch thread history: ${response.status} ${response.statusText}`);
  }
  const history = await response.json();
  return history;
}
