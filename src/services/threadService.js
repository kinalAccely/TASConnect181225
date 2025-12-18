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
