import React, { useEffect, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar.jsx";
import ChatSection from "./components/ChatSection.jsx";
import RightSidebar from "./components/RightSidebar.jsx";
import TopHeader from "./components/TopHeader.jsx";
import { useStream } from "@langchain/langgraph-sdk/react";
import { resolveAssistantId, fetchThreadById, getStreamMessages, createThread, threadHistory } from "./services/threadService.js";
import { useIdleMemo } from "./utils/useIdleMemo.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const DEFAULT_TIMELINE_STEPS = [
  "Load interactive preview",
  "Demonstrate the core workflow",
  "Highlight captured insights",
  "Outline follow-up actions",
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const SANDBOX_HOST = import.meta.env.VITE_SANDBOX_HOST ?? undefined;
const DEFAULT_ASSISTANT_ID = resolveAssistantId();
const ASSISTANT_SUGGESTIONS = [
  {
    id: DEFAULT_ASSISTANT_ID,
    label: "Chat",
    description: "Have a general conversation with the TAS assistant.",
  },
  {
    id: resolveAssistantId("training_module_graph"),
    label: "Training",
    description: "Run through guided onboarding and training flows.",
  },
  {
    id: resolveAssistantId("live_demo"),
    label: "Live Demo",
    description: "Launch the interactive demo workflow with sandbox access.",
  },
];

const extractAssistantIdFromThread = (thread) => {
  if (!thread || typeof thread !== "object") {
    return undefined;
  }

  const candidates = [
    thread.graph_id,
    thread.graphId,
    thread.assistant_id,
    thread.assistantId,
    thread?.metadata?.graph_id,
    thread?.metadata?.assistant_id,
    thread?.metadata?.assistantId,
  ];

  const match = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  if (!match) {
    return undefined;
  }

  return resolveAssistantId(match);
};

const UNIFIED_STREAM_MODES = ["messages", "modules", "metadata", "custom", "updates"];
// const UNIFIED_STREAM_MODES = ["messages-tuple", "messages", "metadata", "custom", "updates"];
const TEXTUAL_CONTENT_TYPES = new Set([
  "text",
  "output_text",
  "ai",
  "assistant",
  "response",
  "module",
]);

const resolveRole = (message, fallback) => {
  if (message?.role) {
    return message.role;
  }
  if (message?.type === "human" || message?.type === "user") {
    return "user";
  }
  if (message?.type === "system") {
    return "system";
  }
  if (message?.type === "tool" || message?.type === "tool_message") {
    return "tool";
  }
  return fallback;
};

const extractTextFromContent = (content) => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) {
          return "";
        }
        if (typeof part === "string") {
          return part;
        }
        if (
          part.type &&
          !TEXTUAL_CONTENT_TYPES.has(part.type) &&
          !part.type.includes("text")
        ) {
          return "";
        }
        if (typeof part.text === "string") {
          return part.text;
        }
        if (Array.isArray(part.text)) {
          return part.text.filter(Boolean).join("");
        }
        if (typeof part.value === "string") {
          return part.value;
        }
        if (typeof part.content === "string") {
          return part.content;
        }
        if (
          typeof part?.data?.content === "string" &&
          part.type?.includes("text")
        ) {
          return part.data.content;
        }
        return "";
      })
      .join("");
  }

  if (typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }
    if (Array.isArray(content.text)) {
      return content.text.filter(Boolean).join("");
    }
    if (typeof content.value === "string") {
      return content.value;
    }
    if (typeof content.content === "string") {
      return content.content;
    }
  }

  return "";
};

const extractModuleText = (modulePayload) => {
  if (!modulePayload) {
    return "";
  }

  const visited = new WeakSet();

  const traverse = (value) => {
    if (value == null) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => traverse(item))
        .filter(Boolean)
        .join("\n");
    }
    if (typeof value === "object") {
      if (visited.has(value)) {
        return "";
      }
      visited.add(value);

      if (typeof value.text === "string") {
        return value.text;
      }
      if (Array.isArray(value.text)) {
        return value.text.filter(Boolean).join("");
      }

      if (value.content !== undefined) {
        const contentText =
          typeof value.content === "string"
            ? value.content
            : Array.isArray(value.content)
              ? value.content
                .map((item) =>
                  typeof item === "string" ? item : traverse(item),
                )
                .filter(Boolean)
                .join("")
              : traverse(value.content);
        if (contentText) {
          return contentText;
        }
      }

      if (value.value !== undefined) {
        const valueText = traverse(value.value);
        if (valueText) {
          return valueText;
        }
      }

      if (Array.isArray(value.messages)) {
        const messagesText = value.messages
          .map((message) => {
            if (!message) {
              return "";
            }
            if (typeof message === "string") {
              return message;
            }
            if (typeof message.text === "string") {
              return message.text;
            }
            if (Array.isArray(message.text)) {
              return message.text.filter(Boolean).join("");
            }
            if (message.content) {
              return traverse(message.content);
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
        if (messagesText) {
          return messagesText;
        }
      }

      const merged = Object.values(value)
        .map((entry) => traverse(entry))
        .filter(Boolean)
        .join("\n");
      return merged;
    }

    return "";
  };

  return traverse(modulePayload).trim();
};

const extractMessageText = (message) => {
  if (!message) {
    return "";
  }

  const uniqueSegments = new Set();
  const segments = [];
  const pushSegment = (value) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (uniqueSegments.has(trimmed)) {
      return;
    }
    uniqueSegments.add(trimmed);
    segments.push(trimmed);
  };

  if (typeof message.text === "string" && message.text.length > 0) {
    pushSegment(message.text);
  }
  if (typeof message.content === "string") {
    pushSegment(message.content);
  } else {
    const contentText = extractTextFromContent(message.content);
    if (contentText) {
      pushSegment(contentText);
    }
  }

  const moduleCandidates = [
    message.module,
    message.module_output,
    message.moduleOutput,
    message.moduleResult,
  ];
  moduleCandidates.forEach((candidate) => {
    const moduleText = extractModuleText(candidate);
    if (moduleText) {
      pushSegment(moduleText);
    }
  });

  if (typeof message.value === "string") {
    pushSegment(message.value);
  }

  return segments.join("\n\n");
};

const MODULE_STREAM_RULES = {
  agent: {
    acceptEvents: ["updates", "result", "router"],
    hideIntermediateAssistants: true,
  },

  training_module_graph: {
    acceptEvents: ["aggregator"],
    hideIntermediateAssistants: true,
  },

  default: {
    acceptEvents: [],
    hideIntermediateAssistants: false,
  },
};

const shouldAcceptStreamingAssistant = () => {
  if (assistantId === "agent") {
    return (
      updateEventKeys.includes("updates") ||
      updateEventKeys.includes("result")
    );
  }

  if (assistantId === "training_module_graph") {
    return updateEventKeys.includes("aggregator");
  }

  return true;
};


const mapMessagesForDisplay = (
  streamMessages,
  isLoading,
  custom,
  updatedevents = {},
  assistantId,
  customMsg
) => {
  if (!Array.isArray(streamMessages)) return [];
  // console.log(customMsg, streamMessages);
  const updateEventKeys = Object.keys(updatedevents);
  const normalized = [];
  let lastAssistantIndex = -1;

  streamMessages.forEach((message, index) => {
    if (!message) return;

    const type = message.type ?? message.role;

    // 🚫 Ignore tool events completely
    if (
      type === "tool" ||
      type === "tool_calls" ||
      type === "tool_message" ||
      type === "tool_result"
    ) {
      return;
    }

    const role = resolveRole(message, "assistant");
    const rawText = extractMessageText(message);
    const trimmedText = rawText?.trim?.() ?? "";

    const isAssistant = role === "assistant" || role === "system" || role == 'ai';
    // 🚫 HARD BLOCK internal nodes (history + streaming)
    const internalModule = customMsg?.stage;
    if (
      (internalModule === "retriever" ||
        internalModule === "planner" ||
        internalModule === "executor") && isAssistant && index == streamMessages.length - 1
    ) {
      return;
    }

    const isLastMessage = index === streamMessages.length - 1;
    const isStreamingAssistant =
      isAssistant && isLastMessage && isLoading;

    /**
     * =====================================================
     * 🔑 STREAM FILTER — ONLY CURRENT STREAMING MESSAGE
     * =====================================================
     */
    if (isStreamingAssistant) {
      if (assistantId === "agent") {
        if (
          !(
            updateEventKeys.includes("updates") ||
            updateEventKeys.includes("result")
          )
        ) {
          return;
        }
      }

      if (assistantId === "training_module_graph") {
        if (!updateEventKeys.includes("aggregator")) {
          return;
        }
      }

      // Skip empty streaming chunks only
      if (!trimmedText) return;
    }

    /**
     * =====================================================
     * ✅ HISTORY IS NEVER FILTERED
     * =====================================================
     */
    normalized.push({
      id: message.id ?? `${role}-${index}`,
      role,
      text: trimmedText || rawText,
      type,
      raw: message,
      isStreaming: false,
      assistant_id: assistantId,
      generate_module: message.generate_module,
    });

    if (isAssistant) {
      lastAssistantIndex = normalized.length - 1;
    }
  });

  /**
   * 🔄 Mark ONLY the latest assistant as streaming
   */
  if (isLoading && lastAssistantIndex >= 0) {
    normalized[lastAssistantIndex] = {
      ...normalized[lastAssistantIndex],
      isStreaming: true,
    };
  }

  return normalized;
};


const resolveStageFromValues = (values) => {
  if (!values || typeof values !== "object") {
    return {
      stage: undefined,
      stageProgress: undefined,
    };
  }

  const stage =
    typeof values.stage === "string"
      ? values.stage
      : typeof values.stageName === "string"
        ? values.stageName
        : typeof values.current_stage === "string"
          ? values.current_stage
          : undefined;

  const progressValue =
    typeof values.stageProgress === "number"
      ? values.stageProgress
      : typeof values.stage_progress === "number"
        ? values.stage_progress
        : typeof values.progress === "number"
          ? values.progress
          : undefined;

  const stageProgress =
    typeof progressValue === "number" && Number.isFinite(progressValue)
      ? Math.min(Math.max(progressValue, 0), 100)
      : undefined;

  return { stage, stageProgress };
};

export default function workSpaceLayout() {
  const [updatedevents, setUpdatedEvents] = React.useState({});
  const [customMsg, setCustomMsg] = useState({});
  const chatBodyRef = React.useRef(null);
  const [scrollToBottom, setScrollToBottomTrigger] = React.useState(false);
  const lastProcessedIndexRef = React.useRef(0);
  const [assistantId, setAssistantId] = React.useState(DEFAULT_ASSISTANT_ID);
  const [showAssistantChooser, setShowAssistantChooser] = React.useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = React.useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [activeThreadId, setActiveThreadId] = React.useState(null);
  const [toolOutputs, setToolOutputs] = React.useState([]);
  const [sources, setSources] = React.useState([]);
  const [pendingMessages, setPendingMessages] = React.useState([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [overrideSandboxUrl, setOverrideSandboxUrl] = React.useState(undefined);
  const [toolScanVersion, setToolScanVersion] = React.useState(0);
  const [scrollTrigger, setScrollTrigger] = React.useState(0);
  const [theme, setTheme] = React.useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem("tas-theme");
    return stored === "dark" ? "dark" : "light";
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [timelineSteps, setTimelineSteps] = React.useState(DEFAULT_TIMELINE_STEPS);
  const [streamError, setStreamError] = React.useState(null);
  const seenToolIdsRef = React.useRef(new Set());
  const toolChunkAccumulatorRef = React.useRef(new Map());
  const sourcesCacheRef = React.useRef(new Map());
  const activeRunRef = React.useRef(null);
  const cancelActiveRunRef = React.useRef(null);
  const activeThreadIdRef = React.useRef(null);
  const previousToolCountRef = React.useRef(0);
  const previousUserMessageCountRef = React.useRef(0);
  const transitionTimeoutRef = React.useRef(null);
  const lastThreadAssistantRef = React.useRef({ threadId: null, assistantId: null });
  const [isThreadTransitioning, setIsThreadTransitioning] = React.useState(false);
  const [chatId, setChatId] = React.useState(null);
  const previousChatIdRef = React.useRef(chatId ?? null);

  const { chatId: threadChatId } = useParams();
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[1] === "chat") {
      setChatId(pathParts[2]);
    }
  }, [location.pathname])

  const storeActiveRunMeta = React.useCallback(
    (runMeta) => {
      if (!runMeta || typeof runMeta !== "object" || !runMeta.run_id) {
        return;
      }

      const fallbackThreadId =
        typeof activeThreadId === "string" && activeThreadId.trim().length > 0
          ? activeThreadId
          : undefined;

      const inferredContainerId =
        runMeta?.container_id ?? runMeta?.containerId ?? runMeta?.container ??
        streamValues?.container_id ?? streamValues?.containerId ?? streamValues?.live_demo?.container_id ?? streamValues?.liveDemo?.container_id ??
        undefined;

      const normalizedMeta = {
        ...runMeta,
        thread_id: runMeta.thread_id ?? fallbackThreadId,
        ...(inferredContainerId ? { container_id: inferredContainerId } : {}),
      };

      activeRunRef.current = normalizedMeta;

      if (
        normalizedMeta.thread_id &&
        typeof window !== "undefined" &&
        window.sessionStorage
      ) {
        try {
          window.sessionStorage.setItem(
            `lg:stream:${normalizedMeta.thread_id}`,
            normalizedMeta.run_id,
          );
          if (normalizedMeta.container_id) {
            try {
              window.sessionStorage.setItem(
                `lg:stream:${normalizedMeta.thread_id}:container_id`,
                String(normalizedMeta.container_id),
              );
              console.log(
                "Persisted container_id for run",
                normalizedMeta.run_id,
                "thread",
                normalizedMeta.thread_id,
                "container_id",
                normalizedMeta.container_id,
              );
            } catch (storageError) {
              console.warn("Unable to persist container_id for run metadata:", storageError);
            }
          }
        } catch (storageError) {
          console.warn("Unable to persist run metadata:", storageError);
        }
      }
    },
    [activeThreadId],
  );

  React.useEffect(() => {
    setTimelineSteps(DEFAULT_TIMELINE_STEPS);
  }, [chatId]);

  const assistantSuggestions = React.useMemo(() => ASSISTANT_SUGGESTIONS, []);

  // React.useEffect(() => {
  //   const normalizedChatId = chatId ?? null;
  //   if (previousChatIdRef.current !== normalizedChatId) {
  //     previousChatIdRef.current = normalizedChatId;
  //     if (normalizedChatId) {
  //       setShowAssistantChooser(false);
  //     }
  //   }
  // }, [chatId]);

  // React.useEffect(() => {
  //   if (!chatId) {
  //     lastThreadAssistantRef.current = { threadId: null, assistantId: null };
  //     return;
  //   }

  //   const normalizedChatId = String(chatId);

  //   if (lastThreadAssistantRef.current.threadId === normalizedChatId) {
  //     const storedAssistantId = lastThreadAssistantRef.current.assistantId;
  //     if (storedAssistantId && storedAssistantId !== assistantId) {
  //       setAssistantId(storedAssistantId);
  //     }
  //     if (showAssistantChooser) {
  //       setShowAssistantChooser(false);
  //     }
  //     return;
  //   }

  //   let isActive = true;

  //   const loadThreadAssistant = async () => {
  //     try {
  //       const thread = await fetchThreadById(normalizedChatId);
  //       if (!isActive) {
  //         return;
  //       }
  //       const threadAssistantId = extractAssistantIdFromThread(thread);
  //       lastThreadAssistantRef.current = {
  //         threadId: normalizedChatId,
  //         assistantId: threadAssistantId ?? null,
  //       };
  //       if (threadAssistantId && threadAssistantId !== assistantId) {
  //         setAssistantId(threadAssistantId);
  //       }
  //       if (threadAssistantId && showAssistantChooser) {
  //         setShowAssistantChooser(false);
  //       }
  //     } catch (error) {
  //       console.warn("Unable to resolve assistant for thread:", error);
  //       if (isActive) {
  //         lastThreadAssistantRef.current = {
  //           threadId: normalizedChatId,
  //           assistantId: null,
  //         };
  //       }
  //     }
  //   };

  //   loadThreadAssistant();

  //   return () => {
  //     isActive = false;
  //   };
  // }, [chatId, assistantId, showAssistantChooser]);

  React.useEffect(() => {
    if (activeThreadId) {
      setShowAssistantChooser(false);
    }
  }, [activeThreadId]);

  const resetToolTracking = React.useCallback(() => {
    setToolOutputs([]);
    setSources([]);
    seenToolIdsRef.current.clear();
    toolChunkAccumulatorRef.current.clear();
    setToolScanVersion((prev) => prev + 1);
  }, []);

  const triggerThreadTransition = React.useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsThreadTransitioning(true);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsThreadTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 280);
  }, []);

  React.useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  React.useEffect(() => {
    const normalizedId =
      typeof chatId === "string" && chatId.trim().length > 0 ? chatId.trim() : null;

    if (normalizedId === activeThreadIdRef.current) {
      return;
    }

    triggerThreadTransition();
    setActiveThreadId(normalizedId);
  }, [chatId, triggerThreadTransition]);

  // const handleThreadId = React.useCallback(
  //   (threadId) => {
  //     if (threadId !== activeThreadId) {
  //       triggerThreadTransition();
  //     }
  //     setActiveThreadId(threadId);
  //     setRefreshKey((prev) => prev + 1);
  //     if (typeof navigate === "function" && threadId) {
  //       navigate(`/chat/${threadId}`);
  //     }
  //   },
  //   [navigate, activeThreadId, triggerThreadTransition],
  // );

  const upsertEntries = React.useCallback((setter) => {
    return (payload) => {
      const entries = Array.isArray(payload) ? payload : [payload];
      setter((prev) => {
        const next = [...prev];
        entries.forEach((entry) => {
          if (!entry || typeof entry !== "object") {
            return;
          }
          const key =
            entry.id ??
            entry.tool_call_id ??
            entry.toolName ??
            entry.name ??
            `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const existingIndex = next.findIndex(
            (item) => (item.__key ?? item.id ?? item.tool_call_id) === key,
          );
          const normalized = { ...entry, __key: key };
          if (existingIndex >= 0) {
            next[existingIndex] = { ...next[existingIndex], ...normalized };
          } else {
            next.push(normalized);
          }
        });
        return next;
      });
    };
  }, []);

  const appendToolOutputs = React.useMemo(
    () => upsertEntries(setToolOutputs),
    [upsertEntries],
  );
  const appendSources = React.useMemo(
    () => upsertEntries(setSources),
    [upsertEntries],
  );

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tas-theme", next);
      }
      return next;
    });
  }, []);

  const containerClassName = React.useMemo(
    () =>
      theme === "dark"
        ? "flex h-full min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8 text-slate-100"
        : "flex h-full min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-[var(--brand-lighter)] via-zinc-50 to-white px-6 py-8 text-zinc-700",
    [theme],
  );

  const handleCustomEvent = React.useCallback(
    (event) => {
      if (!event || typeof event !== "object") {
        return;
      }
      if (event.tool) {
        appendToolOutputs(event.tool);
      }
      if (event.source) {
        appendSources(event.source);
      }
    },
    [appendSources, appendToolOutputs],
  );

  const handleMetadataEvent = React.useCallback(
    (metadata) => {
      if (!metadata || typeof metadata !== "object") {
        return;
      }

      const directRunId =
        typeof metadata.run_id === "string" ? metadata.run_id : undefined;
      const nestedRunId =
        typeof metadata?.run?.run_id === "string"
          ? metadata.run.run_id
          : undefined;

      const resolvedRunMeta =
        directRunId || nestedRunId
          ? {
            run_id: directRunId ?? nestedRunId,
            thread_id:
              typeof metadata.thread_id === "string"
                ? metadata.thread_id
                : typeof metadata?.run?.thread_id === "string"
                  ? metadata.run.thread_id
                  : undefined,

          }
          : undefined;

      if (resolvedRunMeta) {
        storeActiveRunMeta(resolvedRunMeta);
      }

      const metadataEventType =
        typeof metadata.type === "string"
          ? metadata.type
          : typeof metadata.event === "string"
            ? metadata.event
            : undefined;

      if (
        metadataEventType === "response.failed" &&
        resolvedRunMeta &&
        typeof cancelActiveRunRef.current === "function"
      ) {
        void cancelActiveRunRef.current(resolvedRunMeta);
        const failureMessage =
          typeof metadata?.error?.message === "string" && metadata.error.message.trim().length > 0
            ? metadata.error.message.trim()
            : "Stream disconnected before completion.";
        setStreamError(failureMessage);
      }

      if (metadata.tool || metadata.tools) {
        appendToolOutputs(metadata.tool ?? metadata.tools);
      }
      if (metadata.source || metadata.sources) {
        appendSources(metadata.source ?? metadata.sources);
      }
    },
    [appendSources, appendToolOutputs, storeActiveRunMeta, cancelActiveRunRef],
  );

  const {
    client,
    messages: streamMessages,
    submit,
    isLoading,
    stop,
    custom,
    values: streamValues,
  } = useStream({
    assistantId,
    graphId: assistantId,
    apiUrl: API_BASE_URL || undefined,
    threadId: activeThreadId,
    streamMode: UNIFIED_STREAM_MODES,
    // onThreadId: handleThreadId,
    // fetchStateHistory: true,
    reconnectOnMount: false,
    onCreated: (runMeta) => {
      setNewChat(false);
      console.log("Stream created with run metadata:", runMeta);
      storeActiveRunMeta(runMeta);
    },
    onUpdateEvent: (runMeta) => {
      setUpdatedEvents(runMeta);
    },
    onFinish: (_state, runMeta) => {
      setUpdatedEvents([]);
      if (runMeta?.run_id && activeRunRef.current?.run_id === runMeta.run_id) {
        activeRunRef.current = null;
      }
      setStreamError(null);
      const threadForMeta =
        runMeta?.thread_id ??
        (typeof activeThreadId === "string" && activeThreadId.trim().length > 0
          ? activeThreadId
          : undefined);
      if (threadForMeta && typeof window !== "undefined") {
        try {
          window.sessionStorage?.removeItem(`lg:stream:${threadForMeta}`);
          try {
            window.sessionStorage?.removeItem(`lg:stream:${threadForMeta}:container_id`);
            console.log("Cleared persisted container_id for thread", threadForMeta);
          } catch (storageError) {
            console.warn("Unable to clear persisted container_id after completion:", storageError);
          }
        } catch (storageError) {
          console.warn("Unable to clear run metadata after completion:", storageError);
        }
      }
    },

    onCustomEvent: (event) => {
      console.log("event", event);
      setCustomMsg(event);
      handleCustomEvent(event);
    },
    onError: (streamError, runMeta) => {
      console.error("LangGraph stream error:", streamError);
      const cancelFn = cancelActiveRunRef.current;
      if (typeof cancelFn === "function") {
        void cancelFn(runMeta);
      }
      const friendlyMessage =
        typeof streamError?.message === "string" && streamError.message.trim().length > 0
          ? streamError.message.trim()
          : "Stream disconnected before completion.";
      setStreamError(friendlyMessage);
    },
  });


  useEffect(() => {
    setIsRightCollapsed(true)
  }, [!activeThreadId])

  const cancelActiveRun = React.useCallback(
    async (runMeta) => {
      if (!client) {
        return;
      }

      const fallbackThreadId =
        typeof activeThreadId === "string" && activeThreadId.trim().length > 0
          ? activeThreadId
          : null;
      const effectiveMeta = runMeta ?? activeRunRef.current;
      const runThreadId = effectiveMeta?.thread_id ?? fallbackThreadId;
      if (!runThreadId) {
        return;
      }

      const storageKey = `lg:stream:${runThreadId}`;
      let runId = effectiveMeta?.run_id ?? null;

      if (!runId && typeof window !== "undefined") {
        try {
          runId = window.sessionStorage?.getItem(storageKey) ?? null;
        } catch (storageError) {
          console.warn("Unable to read run metadata from session storage:", storageError);
        }
      }

      if (!runId) {
        return;
      }

      const normalizedBaseUrl =
        typeof API_BASE_URL === "string" && API_BASE_URL.length > 0
          ? API_BASE_URL.endsWith("/")
            ? API_BASE_URL.slice(0, -1)
            : API_BASE_URL
          : null;

      try {
        if (normalizedBaseUrl) {
          const cancelUrl = `${normalizedBaseUrl}/threads/${encodeURIComponent(runThreadId)}/runs/${encodeURIComponent(runId)}/cancel?wait=0&action=cancel`;
          const response = await fetch(cancelUrl, { method: "POST" });
          if (!response.ok && response.status !== 404) {
            throw new Error(`Cancel request failed: ${response.status} ${response.statusText}`);
          }
        } else {
          await client.runs.cancel(runThreadId, runId);
        }
      } catch (cancelError) {
        console.warn("Unable to cancel active run:", cancelError);
      } finally {
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage?.removeItem(storageKey);
            try {
              window.sessionStorage?.removeItem(`${storageKey}:container_id`);
              console.log("Cleared persisted container_id for storageKey", `${storageKey}:container_id`);
            } catch (storageError) {
              console.warn("Unable to clear persisted container_id after cancellation:", storageError);
            }
          } catch (storageError) {
            console.warn("Unable to clear run metadata after cancellation:", storageError);
          }
        }
        if (activeRunRef.current?.run_id === runId) {
          activeRunRef.current = null;
        }
        // If this run had an associated sandbox/container and we're in Live Demo,
        // attempt to call the cleanup endpoint so the backend can remove the container.
        try {
          const containerId =
            effectiveMeta?.container_id ??
            effectiveMeta?.containerId ??
            effectiveMeta?.container ??
            streamValues?.container_id ??
            streamValues?.containerId ??
            streamValues?.live_demo?.container_id ??
            streamValues?.liveDemo?.container_id ??
            undefined;

          if (containerId) {
            const cleanupBody = { container_id: String(containerId) };
            const cleanupUrl = normalizedBaseUrl
              ? `${normalizedBaseUrl}/cleanup`
              : `/cleanup`;
            try {
              await fetch(cleanupUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanupBody),
              });

              // If we have a video URL available in metadata or stream values,
              // use it to replace the sandbox preview after cleanup.
              const videoUrl =
                effectiveMeta?.video_url ??
                effectiveMeta?.videoUrl ??
                streamValues?.video_url ??
                streamValues?.videoUrl ??
                streamValues?.live_demo?.video_url ??
                streamValues?.liveDemo?.video_url ??
                undefined;

              if (videoUrl && typeof videoUrl === "string" && videoUrl.trim().length > 0) {
                setOverrideSandboxUrl(videoUrl.trim());
                if (activeRunRef.current) {
                  activeRunRef.current = { ...activeRunRef.current, sandbox_url: videoUrl };
                }
                console.log("Replaced sandbox preview with video_url after cleanup:", videoUrl);
              }
            } catch (cleanupErr) {
              console.warn("Unable to call /cleanup for sandbox container:", cleanupErr);
            }
          }
        } catch (err) {
          console.warn("Error while attempting sandbox cleanup:", err);
        }
      }
    },
    [client, activeThreadId],
  );

  cancelActiveRunRef.current = cancelActiveRun;

  // Ensure any container id provided in streamValues is merged into the
  // currently-stored run metadata so cleanup and other run-level operations
  // can access it from `activeRunRef.current`.
  React.useEffect(() => {
    try {
      if (!streamValues || typeof streamValues !== "object") return;

      const containerId =
        streamValues?.container_id ??
        streamValues?.containerId ??
        streamValues?.container ??
        streamValues?.live_demo?.container_id ??
        streamValues?.liveDemo?.container_id ??
        undefined;

      if (containerId && activeRunRef.current && !activeRunRef.current?.container_id) {
        activeRunRef.current = { ...activeRunRef.current, container_id: containerId };
        try {
          const threadId = activeRunRef.current?.thread_id;
          if (threadId && typeof window !== "undefined" && window.sessionStorage) {
            try {
              window.sessionStorage.setItem(
                `lg:stream:${threadId}:container_id`,
                String(containerId),
              );
              console.log(
                "Merged and persisted container_id for thread",
                threadId,
                "container_id",
                containerId,
                "run_id",
                activeRunRef.current?.run_id,
              );
            } catch (storageError) {
              console.warn("Unable to persist merged container_id for run metadata:", storageError);
            }
          }
        } catch (err) {
          console.warn("Error while persisting merged container_id:", err);
        }
      }
    } catch (err) {
      console.warn("Unable to merge container_id into active run metadata:", err);
    }
  }, [streamValues]);

  // Clear any override sandbox URL when new streamValues arrive that may
  // define a fresh sandbox preview. We keep the override after cleanup until
  // new streamValues provide a replacement.
  React.useEffect(() => {
    if (!streamValues || typeof streamValues !== "object") return;
    const hasSandboxCandidate =
      typeof streamValues.sandbox_url === "string" && streamValues.sandbox_url.trim().length > 0 ||
      typeof streamValues.sandboxUrl === "string" && streamValues.sandboxUrl.trim().length > 0 ||
      (streamValues.live_demo && typeof streamValues.live_demo.sandbox_url === "string" && streamValues.live_demo.sandbox_url.trim().length > 0) ||
      (streamValues.liveDemo && typeof streamValues.liveDemo.sandbox_url === "string" && streamValues.liveDemo.sandbox_url.trim().length > 0);
    if (hasSandboxCandidate) {
      setOverrideSandboxUrl(undefined);
    }
  }, [streamValues]);

  // Avoid re-running the expensive mapper on every render by depending on
  // a small, stable set of keys: the stream length and the last message id
  // (or type), plus a compact key for updatedevents and the assistantId.
  const streamLength = Array.isArray(streamMessages) ? streamMessages.length : 0;
  const streamLastKey =
    streamLength > 0
      ? streamMessages[streamLength - 1]?.id ?? streamMessages[streamLength - 1]?.type ?? streamLength
      : 0;
  const updatedEventsKey =
    updatedevents && (typeof updatedevents.run_id === "string"
      ? updatedevents.run_id
      : typeof updatedevents.type === "string"
        ? updatedevents.type
        : Object.keys(updatedevents).join(","));

  // const baseMessages = useIdleMemo(
  //   () => mapMessagesForDisplay(streamMessages, isLoading, custom, updatedevents, assistantId, customMsg),
  //   [streamLength, streamLastKey, isLoading, updatedevents, assistantId, customMsg],
  // ) ?? [];

  // Preserve a stable copy of base messages to avoid history flicker when the
  // stream delivers only incremental deltas (which may cause `baseMessages`
  // to be temporarily shorter). We only merge/replace the final assistant
  // entry during streaming so historical messages remain stable.
  // const stableBaseRef = React.useRef([]);
  // const stableBaseMessages = React.useMemo(() => {
  //   if (!Array.isArray(baseMessages)) {
  //     return stableBaseRef.current ?? [];
  //   }

  //   // When not streaming, trust the computed baseMessages and snapshot them.
  //   if (!isLoading) {
  //     stableBaseRef.current = baseMessages;
  //     return baseMessages;
  //   }

  //   // While streaming, if the incoming mapper returned nothing but we have
  //   // previously rendered history, keep the previous history intact.
  //   if (baseMessages.length === 0 && (stableBaseRef.current ?? []).length > 0) {
  //     return stableBaseRef.current;
  //   }

  //   // If mapper returned fewer messages than our stable copy, preserve history
  //   // but replace the last entry if the mapper is providing a streaming assistant
  //   // chunk (so the UI still shows the in-progress text for the current run).
  //   const prev = stableBaseRef.current ?? [];
  //   if (baseMessages.length < prev.length && prev.length > 0) {
  //     const lastOfBase = baseMessages[baseMessages.length - 1];
  //     if (lastOfBase && lastOfBase.isStreaming) {
  //       const merged = [...prev];
  //       merged[merged.length - 1] = lastOfBase;
  //       stableBaseRef.current = merged;
  //       return merged;
  //     }
  //     return prev;
  //   }

  //   // Default: accept new baseMessages and snapshot them.
  //   stableBaseRef.current = baseMessages;
  //   return baseMessages;
  // }, [baseMessages, isLoading]);

  // React.useEffect(() => {
  //   const userCount = baseMessages.reduce(
  //     (count, message) => (message?.role === "user" ? count + 1 : count),
  //     0,
  //   );
  //   const previousCount = previousUserMessageCountRef.current;
  //   if (userCount > previousCount && pendingMessages.length > 0) {
  //     const delta = userCount - previousCount;
  //     setPendingMessages((prev) => prev.slice(delta));
  //   }
  //   previousUserMessageCountRef.current = userCount;
  // }, [baseMessages, pendingMessages.length]);

  React.useEffect(() => {
    previousUserMessageCountRef.current = 0;
    setPendingMessages((prev) => (prev.length === 0 ? prev : []));
  }, [activeThreadId]);

  // const messagesWithCanvas = React.useMemo(() => {
  // const baseMessagesCopy = [...stableBaseMessages];
  // const modulePayload =
  //   streamValues && typeof streamValues === "object"
  //     ? streamValues.canvas ??
  //     streamValues.canvas_data ??
  //     streamValues.module ??
  //     streamValues.modules ??
  //     undefined
  //     : undefined;

  // if (!modulePayload) {
  //   return baseMessagesCopy;
  // }

  // let moduleText;
  // if (typeof modulePayload === "string") {
  //   moduleText = modulePayload;
  // } 
  // else {
  //   try {
  //     moduleText = JSON.stringify(modulePayload, null, 2);
  //     if (moduleText && moduleText.trim().length > 0) {
  //       moduleText = `\`\`\`json\n${moduleText}\n\`\`\``;
  //     }
  //   } catch {
  //     moduleText = String(modulePayload);
  //   }
  // }

  // if (!moduleText || moduleText.trim().length === 0) {
  //   return baseMessagesCopy;
  // }

  // Only consider it already present when a previous canvas entry has the same rendered text.
  // Previously this flagged any `__source === 'canvas-payload'` as duplicate which prevented
  // appending multiple distinct canvases. Now we only dedupe identical payloads.
  // const alreadyPresent = baseMessagesCopy.some((msg) => {
  //   if (!msg) return false;
  //   if (msg?.__source === "canvas-payload" && msg.text === moduleText) return true;
  //   if (msg?.raw?.canvas && msg.text === moduleText) return true;
  //   return false;
  // });

  // if (alreadyPresent) {
  //   return baseMessagesCopy;
  // }

  //   return stableBaseMessages;
  //   // return [
  //   //   ...baseMessagesCopy,
  //   //   {
  //   //     id: "canvas-payload",
  //   //     role: "assistant",
  //   //     text: moduleText,
  //   //     type: "canvas",
  //   //     raw: { canvas: modulePayload },
  //   //     generate_module: true,
  //   //     __source: "canvas-payload",
  //   //   },
  //   // ];
  // }, [stableBaseMessages, streamValues]);

  // const normalizedMessages = React.useMemo(
  //   () =>
  //     mapMessagesForDisplay(
  //       streamMessages,
  //       isLoading,
  //       custom,
  //       updatedevents,
  //       assistantId,
  //       customMsg
  //     ),
  //   [streamLength, streamLastKey, assistantId] // ✅
  // );
  // if (pendingMessages.length === 0) {
  //   return stableBaseMessages;
  // }
  // return [...stableBaseMessages, ...pendingMessages];
  // }, [stableBaseMessages, pendingMessages]);

  // Treat the case where the only message is an assistant-switch system message
  // (we add these after selecting an assistant) as effectively empty so the
  // suggestion chooser can still show.

  const shouldShowAssistantSuggestions = showAssistantChooser && !activeThreadId;

  const sandboxUrl = React.useMemo(() => {
    if (!streamValues || typeof streamValues !== "object") {
      return undefined;
    }

    const candidates = [
      streamValues.sandbox_url,
      streamValues.sandboxUrl,
      streamValues.sandboxURL,
      streamValues?.live_demo?.sandbox_url,
      streamValues?.live_demo?.sandboxUrl,
      streamValues?.liveDemo?.sandbox_url,
      streamValues?.liveDemo?.sandboxUrl,
    ];

    const match = candidates.find(
      (entry) => typeof entry === "string" && entry.trim().length > 0,
    );

    if (!match) return undefined;
    const vncSuffix = "/vnc/index.html?autoconnect=true&resize=scale&reconnect=1&path=websockify";
    const raw = match.trim();
    try {
      const hasProto = /^https?:\/\//i.test(raw);
      const urlObj = new URL(hasProto ? raw : `http://${raw}`);
      // replace localhost host when present, using env-configured host only
      if (
        urlObj.hostname === "localhost" &&
        typeof SANDBOX_HOST === "string" &&
        SANDBOX_HOST.trim().length > 0
      ) {
        urlObj.hostname = SANDBOX_HOST;
        urlObj.protocol = "http:";
      }
      // if incoming already points at vnc index, preserve path + search
      if (/\/vnc\/index\.html/i.test(urlObj.pathname + (urlObj.search || ""))) {
        return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
      }
      // otherwise append the standard VNC suffix to the origin+existing path (trim trailing slash)
      const basePath = `${urlObj.origin}${urlObj.pathname ? urlObj.pathname.replace(/\/$/, "") : ""}`;
      return `${basePath}${vncSuffix}`;
    } catch (e) {
      // fallback: simple replace of localhost using env-provided host only, then ensure http proto and append vnc
      const replaced =
        typeof SANDBOX_HOST === "string" && SANDBOX_HOST.trim().length > 0
          ? raw.replace(/(^|\b)localhost\b/gi, SANDBOX_HOST)
          : raw;
      if (/\/vnc\/index\.html/i.test(replaced)) {
        return /^https?:\/\//i.test(replaced) ? replaced : `http://${replaced}`;
      }
      const withProto = /^https?:\/\//i.test(replaced) ? replaced.replace(/\/$/, "") : `http://${replaced.replace(/\/$/, "")}`;
      return `${withProto}${vncSuffix}`;
    }
  }, [streamValues]);

  const { stage, stageProgress } = React.useMemo(
    () => resolveStageFromValues(streamValues),
    [streamValues],
  );

  const handleInputChange = React.useCallback(
    (value) => {
      setInput(value);

      // If there's an active thread, don't show assistant chooser
      if (activeThreadId) {
        setShowAssistantChooser(false);
        return;
      }

      const normalized = typeof value === "string" ? value.trimStart() : "";
      // Show suggestions whenever the user types a leading slash and there's no active thread
      if (normalized.startsWith("/")) {
        setShowAssistantChooser(true);
        return;
      }

      // Otherwise hide the chooser for empty or regular input
      // if (!normalized) {
      //   setShowAssistantChooser(false);
      // } else {
      //   setShowAssistantChooser(false);
      // }
    },
    [activeThreadId],
  );

  // React.useEffect(() => {
  //   requestAnimationFrame(() => {
  //     if (chatBodyRef.current && !isNewChat) {
  //       chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  //     }
  //   });
  // }, [normalizedMessages]);

  // const [isNewChat, setNewChat] = React.useState(false);
  // const startNewChat = React.useCallback(() => {
  //   setNewChat(true);
  //   if (isLoading && typeof stop === "function") {
  //     stop().catch((stopError) => {
  //       console.warn("Unable to stop active stream before reset:", stopError);
  //     });
  //   }
  //   triggerThreadTransition();
  //   setActiveThreadId(null);
  //   setUpdatedEvents([]);
  //   setAssistantId('agent');
  //   handleInputChange("");
  //   setSources([]);
  //   setChatId('');
  //   setSearchedMessages([]);
  //   setIsRightCollapsed(true);
  //   setRefreshKey((prev) => prev + 1);
  //   resetToolTracking();
  //   setStreamError(null);
  //   setShowAssistantChooser(false);
  //   lastThreadAssistantRef.current = { threadId: null, assistantId: DEFAULT_ASSISTANT_ID };
  //   if (typeof navigate === "function") {
  //     navigate("/chat");
  //   }
  // }, [
  //   isLoading,
  //   stop,
  //   resetToolTracking,
  //   navigate,
  //   triggerThreadTransition,
  //   handleInputChange,
  // ]);

  React.useEffect(() => {
    if (
      toolOutputs.length > 0 &&
      previousToolCountRef.current === 0 &&
      isRightCollapsed
    ) {
      setIsRightCollapsed(false);
    }
    previousToolCountRef.current = toolOutputs.length;
  }, [toolOutputs.length, isRightCollapsed, setIsRightCollapsed]);

  React.useEffect(() => {
    if (activeThreadId) {
      sourcesCacheRef.current.set(activeThreadId, sources);
    }
  }, [sources, activeThreadId]);

  React.useEffect(() => {
    seenToolIdsRef.current.clear();
    toolChunkAccumulatorRef.current.clear();

    if (activeThreadId) {
      const cachedSources =
        sourcesCacheRef.current.get(activeThreadId) ?? [];

      setToolOutputs([]);
      setSources(Array.isArray(cachedSources) ? [...cachedSources] : []);
    } else {
      setToolOutputs([]);
      setSources([]);
    }

    setToolScanVersion((prev) => prev + 1);
  }, [activeThreadId]);

  // React.useEffect(() => {
  //   if (isThreadTransitioning && normalizedMessages.length > 0) {
  //     setIsThreadTransitioning(false);
  //   }
  // }, [isThreadTransitioning, normalizedMessages.length]);

  React.useEffect(() => () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  const applyAssistantSelection = React.useCallback(
    (nextAssistantId, announcementText) => {
      if (!nextAssistantId || nextAssistantId === assistantId) {
        return;
      }

      const normalizedAnnouncement =
        typeof announcementText === "string" && announcementText.trim().length > 0
          ? announcementText.trim()
          : `Assistant set to ${nextAssistantId}`;

      setAssistantId(nextAssistantId);
      resetToolTracking();
      const targetThreadId =
        typeof activeThreadId === "string" && activeThreadId.trim().length > 0
          ? activeThreadId.trim()
          : typeof chatId === "string" && chatId.trim().length > 0
            ? chatId.trim()
            : null;
      if (targetThreadId) {
        lastThreadAssistantRef.current = {
          threadId: targetThreadId,
          assistantId: nextAssistantId,
        };
      }
      // Do not insert a system/pending message into the chat when switching assistants.
      // The UI header displays the current assistant; avoid cluttering the message list.
      setStreamError(null);
    },
    [assistantId, resetToolTracking, activeThreadId, chatId],
  );

  const handleAssistantSuggestionSelect = React.useCallback(
    (option) => {
      if (!option) {
        return;
      }

      const candidate =
        typeof option === "string"
          ? option
          : typeof option?.id === "string"
            ? option.id
            : typeof option?.value === "string"
              ? option.value
              : "";
      const nextAssistantId = resolveAssistantId(candidate);
      if (!nextAssistantId) {
        return;
      }

      const announcement =
        typeof option?.label === "string" && option.label.trim().length > 0
          ? `Assistant set to ${option.label.trim()}`
          : undefined;

      applyAssistantSelection(nextAssistantId, announcement);
      handleInputChange("");
      setShowAssistantChooser(false);
    },
    [applyAssistantSelection, handleInputChange],
  );

  React.useEffect(() => {
    if (!Array.isArray(streamMessages) || streamMessages.length === 0) {
      return;
    }

    const normalizeArgs = (args) => {
      if (args == null) {
        return "";
      }
      if (typeof args === "string") {
        return args;
      }
      if (typeof args === "object") {
        try {
          return JSON.stringify(args, null, 2);
        } catch (err) {
          return String(args);
        }
      }
      return String(args);
    };

    const processCall = (call, { isChunk = false } = {}) => {
      if (!call || typeof call !== "object") {
        return;
      }
      const callId =
        call.id ??
        call.tool_call_id ??
        call.call_id ??
        call.name ??
        `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const title =
        call.name ??
        call.tool ??
        call.toolName ??
        call.type ??
        "Tool Call";
      let content = normalizeArgs(
        call.args ?? call.arguments ?? call.input ?? call.parameters,
      );

      if (isChunk) {
        const previous = toolChunkAccumulatorRef.current.get(callId) ?? "";
        const nextContent = previous + content;
        toolChunkAccumulatorRef.current.set(callId, nextContent);
        content = nextContent;
      } else {
        if (toolChunkAccumulatorRef.current.has(callId) && !content) {
          content = toolChunkAccumulatorRef.current.get(callId) ?? "";
        }
        if (seenToolIdsRef.current.has(callId)) {
          appendToolOutputs({
            id: callId,
            title,
            content,
            raw: call,
          });
          return;
        }
        seenToolIdsRef.current.add(callId);
      }

      appendToolOutputs({
        id: callId,
        title,
        content,
        raw: call,
      });
    };

    const processMessage = (message) => {
      if (!message || typeof message !== "object") {
        return;
      }
      // If the message carries explicit tool_result(s), surface them as tool outputs
      try {
        const explicitResults = [];
        if (message.tool_result) explicitResults.push(message.tool_result);
        if (Array.isArray(message.tool_results)) explicitResults.push(...message.tool_results);
        if (message.toolResult) explicitResults.push(message.toolResult);
        if (Array.isArray(message.toolResults)) explicitResults.push(...message.toolResults);
        if (explicitResults.length > 0) {
          explicitResults.forEach((res) => {
            if (res) appendToolOutputs(res);
          });
        }
      } catch (e) {
        // non-fatal
      }
      const directToolCalls = [
        ...(Array.isArray(message.tool_calls) ? message.tool_calls : []),
        ...(Array.isArray(message.additional_kwargs?.tool_calls)
          ? message.additional_kwargs.tool_calls
          : []),
      ];
      directToolCalls.forEach((call) => processCall(call, { isChunk: false }));

      const chunkCalls = [
        ...(Array.isArray(message.tool_call_chunks)
          ? message.tool_call_chunks
          : []),
      ];
      chunkCalls.forEach((call) => processCall(call, { isChunk: true }));

      if (Array.isArray(message.content)) {
        message.content.forEach((block) => {
          if (!block || typeof block !== "object") {
            return;
          }
          if (
            block.type === "tool_use" ||
            block.type === "tool_call" ||
            block.type === "tool"
          ) {
            processCall(
              {
                id: block.id ?? block.tool_call_id,
                name: block.name ?? block.tool,
                args: block.input ?? block.arguments ?? block.args,
                type: block.type,
              },
              { isChunk: false },
            );
          }
        });
      }
    };

    const start = lastProcessedIndexRef.current;
    const nextMessages = streamMessages.slice(start);
    nextMessages.forEach(processMessage);

    lastProcessedIndexRef.current = streamMessages.length;
  }, [streamMessages, appendToolOutputs, toolScanVersion]);

  const deferredMessages = '';

  React.useEffect(() => {
    if (activeThreadId && deferredMessages.length > 0) {
      setScrollTrigger(prev => prev + 1);
    }
  }, [activeThreadId, deferredMessages.length]);

  // const handleSend = React.useCallback(async () => {
  //   const trimmed = input.trim();
  //   if (!trimmed || isLoading) {
  //     return;
  //   }

  //   // If the user typed a slash and there's no active thread, show suggestions and do not send
  //   if (trimmed.startsWith("/") && !activeThreadId) {
  //     setShowAssistantChooser(true);
  //     setStreamError(null);
  //     return;
  //   }

  //   // Existing slash-command behavior when a thread exists (or when resolving assistant by command)
  //   if (trimmed.startsWith("/")) {
  //     const slashMatch = trimmed.match(/^\/\s*([^\s]+)?/);
  //     const commandKey = slashMatch?.[1];
  //     if (!commandKey) {
  //       setShowAssistantChooser(true);
  //       setStreamError(null);
  //       return;
  //     }
  //     const nextAssistantId = resolveAssistantId(`/${commandKey}`);
  //     if (nextAssistantId) {
  //       applyAssistantSelection(nextAssistantId);
  //       setShowAssistantChooser(false);
  //     }
  //     handleInputChange("");
  //     setStreamError(null);
  //     return;
  //   }

  //   if (!assistantId) {
  //     return;
  //   }

  //   const isExistingThread = Boolean(activeThreadId);
  //   const clientMessageId = `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  //   const pendingMessage = {
  //     id: clientMessageId,
  //     role: "user",
  //     text: trimmed,
  //     type: "user",
  //     raw: { role: "user", content: trimmed },
  //     isPending: true,
  //   };

  //   handleInputChange("");
  //   setSources([]);
  //   setToolOutputs([]);
  //   setPendingMessages((prev) => [...prev, pendingMessage]);
  //   setStreamError(null);
  //   try {
  //     await submit(
  //       {
  //         messages: [
  //           {
  //             role: "user",
  //             content: trimmed,
  //           },
  //         ],
  //       },
  //       {
  //         metadata: isExistingThread
  //           ? undefined
  //           : { thread_name: trimmed, assistant_id: assistantId, graph_id: assistantId },
  //         streamMode: UNIFIED_STREAM_MODES,
  //         streamResumable: true,
  //         streamSubgraphs: true,
  //         threadId: activeThreadId ?? undefined,
  //         onDisconnect: "cancel",
  //         config: { recursion_limit: 100 }
  //       },
  //     );
  //     setRefreshKey((prev) => prev + 1);
  //   } catch (submitError) {
  //     console.error("Failed to submit message:", submitError);
  //     setPendingMessages((prev) =>
  //       prev.filter((message) => message.id !== clientMessageId),
  //     );
  //     handleInputChange(trimmed);
  //   }
  // }, [input, isLoading, submit, activeThreadId, assistantId, applyAssistantSelection, handleInputChange]);

  const handleCopy = React.useCallback((idx) => {
    const node = document.getElementById(`canvas_${idx}`);
    const text = node?.innerText ?? "";
    if (!text) {
      return;
    }
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Unable to copy message:", err);
    });
  }, []);

  const handleDownload = React.useCallback((idx) => {
    const node = document.getElementById(`canvas_${idx}`);
    const text = node?.innerText ?? "";
    if (!text) {
      return;
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "analysis.txt";
    anchor.click();

    URL.revokeObjectURL(url);
  }, []);

  const toggleLeftCollapse = React.useCallback(
    () => setIsLeftCollapsed((prev) => !prev),
    [],
  );

  const handleStop = React.useCallback(() => {
    if (!isLoading) {
      return;
    }
    if (typeof stop === "function") {
      stop().catch((stopError) => {
        console.warn("Unable to stop active stream:", stopError);
      });
    }
    void cancelActiveRun();
  }, [isLoading, stop, cancelActiveRun]);

  const toggleRightCollapse = React.useCallback(
    () => setIsRightCollapsed((prev) => !prev),
    [],
  );

  ///// Chat Search and Thread Creation Logic //////
  const selectedChatId = activeThreadId;
  const [searchedMessages, setSearchedMessages] = useState('');
  const [searchedText, setSearchedText] = useState('');
  const [newStreamingList, setNewStreamingList] = useState([]);
  const hasResultRef = useRef(false);
  const streamedListRef = useRef([]);
  const [chatIsLoading, setChatIsLoading] = useState(false);
  const [isStreamNewChat, setIsStreamNewChat] = useState(true);
  const [loadHistoryToggle, setLoadHistoryToggle] = useState("load");
  const initialMessage = location.state?.initialMessage;
  const state_assistant_id = location.state?.assistant_id || location.state?.assistantId || 'agent';
  const loadHistory = location.state?.loadHistory || location.state?.loadHistory || '';
  const [streamSandboxUrl, setStreamSandboxUrl] = useState('');
  const [selectedThreadChatId, setThreadChatId] = useState('');

  useEffect(() => {
    setThreadChatId(threadChatId);
  }, [threadChatId])
  useEffect(() => {
    setLoadHistoryToggle(`load_${Date.now()}`);
  }, [loadHistory])

  useEffect(() => {
    if (state_assistant_id) {
      setAssistantId(state_assistant_id);
    }
  }, [state_assistant_id]);


  useEffect(() => {
    if (!threadChatId || searchedText.length === 0) return;

    setInput('');
    setLoadHistoryToggle("");

    streamedListRef.current.push({
      id: `user-${Date.now()}`,
      role: "user",
      content: searchedText
    });

    // ✅ Always update UI snapshot
    setNewStreamingList([...streamedListRef.current]);

    setChatIsLoading(true);

    setTimeout(() => {
      getStreamMessages({
        url: `/threads/${threadChatId}/runs/stream`,
        body: {
          input: {
            messages: [{ role: "user", content: searchedText }]
          },
          config: { recursion_limit: 100 },
          stream_mode: [
            "messages",
            "modules",
            "metadata",
            "custom",
            "updates",
            "messages-tuple",
            "values"
          ],
          stream_subgraphs: true,
          stream_resumable: true,
          assistant_id: assistantId,
        },
        options: { on_disconnect: "cancel" },

        onChunk: (event, data) => {
          if (!["messages", "updates"].includes(event)) return;

          if (event === 'messages') {
            if (
              data.some(msg =>
                msg.thread_id &&
                (
                  MODULE_STREAM_RULES[assistantId].acceptEvents?.length === 0 ||
                  (MODULE_STREAM_RULES[assistantId].acceptEvents && MODULE_STREAM_RULES[assistantId].acceptEvents?.includes(msg.langgraph_node))
                )
              )
            ) {
              hasResultRef.current = true;
            }

            if (!hasResultRef.current) return;

            data
              .filter(msg => msg.type === "AIMessageChunk")
              .forEach(msg => {
                const idx = streamedListRef.current.findIndex(m => m.id === msg.id);
                if (idx !== -1) {
                  streamedListRef.current[idx].content += msg.content;
                } else {
                  streamedListRef.current.push({
                    id: msg.id,
                    role: "assistant",
                    content: msg.content
                  });
                }
              });

            setNewStreamingList([...streamedListRef.current]);
          }

          else{
            console.log(data);
            if(data?.invoke_init?.sandbox_url){
              setStreamSandboxUrl(data.invoke_init.sandbox_url);
            }
          }

          // if(isStreamNewChat){
          //   streamedListRef.current = [];

          // }
        },

        onDone: () => {
          setSearchedText('');
          setSearchedMessages([]);
          setChatIsLoading(false);
          hasResultRef.current = false;
          if (initialMessage) {
            navigate(`/chat/${threadChatId}`, {
              replace: true, state: {
                initialMessage: null,
                assistant_id: assistantId
              }
            });
          }
          else {
            setLoadHistoryToggle("load");
          }
        },

        onError: console.error,
      });
    }, 500)
  }, [threadChatId, searchedText]);


  useEffect(() => {
    if (threadChatId) {
      setIsStreamNewChat(false);
      setSearchedText('');
      // threadHistory(threadChatId);
    }
  }, [threadChatId])


  useEffect(() => {
    if (!initialMessage) return;
    setSearchedText(initialMessage);
    setSearchedMessages((prev) => [
      ...prev,
      {
        id: "temp-user-msg",
        role: "user",
        content: initialMessage,
      },
    ]);
  }, [initialMessage]);

  useEffect(() => {
    if (!threadChatId) return;
    let cancelled = false;
    if (loadHistoryToggle.includes("load")) {
      threadHistory(threadChatId).then((response) => {
        if (cancelled) return;

        const historyMessages = Array.isArray(response) ? response : [];

        const filteredMessages = [];

        const msg_values = historyMessages[0]?.values?.messages;
        setStreamSandboxUrl(historyMessages[0]?.values?.sandbox_url)
        for (let i = 0; i < msg_values?.length; i++) {

          const msg = msg_values[i];

          if (!msg) continue;
          if (msg.type !== "human" && msg.type !== "ai") continue;
          if (typeof msg.content !== "string") continue;

          filteredMessages.push({
            id: msg.id,
            role: msg.type === "human" ? "user" : "assistant",
            content: msg.content
          });
        }

        streamedListRef.current = filteredMessages;
        console.log("Fetched thread history messages:", filteredMessages);
        setNewStreamingList(filteredMessages);
      });

      return () => {
        cancelled = true;
      };
    }
  }, [loadHistoryToggle]);


  const openNewChat = () => {
    streamedListRef.current = [];
    setIsStreamNewChat(true);
    setNewStreamingList([]);
    setChatIsLoading(false);
    setLoadHistoryToggle("");
    setSearchedText('');
    setAssistantId('agent');
    setReloadThread(true);
    setStreamSandboxUrl('');
    setThreadChatId('');
  }


  const [reloadThread, setReloadThread] = useState('')
  useEffect(() => {
    if (!searchedText || threadChatId) return;
    createThread(searchedText, assistantId).then((response) => {
      if (response && response.thread_id) {
        setReloadThread(`reload_${Date.now()}`);
        navigate(`/chat/${response.thread_id}`, {
          state: {
            initialMessage: searchedText,
            assistant_id: assistantId
          },
          replace: true,
        });
      }
    });
  }, [searchedText, threadChatId])

  const handleSubmit = () => {
    if (!input) return;
    setSearchedText(input);
  }

  return (
    <div className={containerClassName}>
      <div className="flex h-full w-full min-h-0 max-w-8xl flex-col gap-4">

        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden items-stretch">
          <div className="flex h-full flex-col">
            <TopHeader theme={theme} isLeftCollapsed={isLeftCollapsed} />
            <LeftSidebar
              theme={theme}
              isCollapsed={isLeftCollapsed}
              isLoading={isLoading}
              navigate={navigate}
              onStartNewChat={openNewChat}
              onToggleTheme={toggleTheme}
              onToggleCollapse={toggleLeftCollapse}
              refreshKey={refreshKey}
              refreshThread = {reloadThread}
              selectedChatId={selectedThreadChatId}
            />
          </div>

          <ChatSection
            theme={theme}
            newStreamingList={newStreamingList}
            chatBodyRef={chatBodyRef}
            updatedevents={updatedevents}
            input={input}
            isLoading={chatIsLoading}
            // messages={normalizedMessages}
            isStreamNewChat={isStreamNewChat}
            sandboxUrl={streamSandboxUrl}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onInputChange={handleInputChange}
            onStop={handleStop}
            handleSubmit={handleSubmit}
            onTimelineStepsChange={setTimelineSteps}
            stage={stage}
            stageProgress={stageProgress ?? 0}
            isTransitioning={isThreadTransitioning}
            assistantSuggestions={assistantSuggestions}
            currentAssistantId={assistantId}
            activeModule = {assistantId}
            onAssistantSuggestionSelect={handleAssistantSuggestionSelect}
            shouldShowAssistantSuggestions={shouldShowAssistantSuggestions}
            threadId={activeThreadId}
          />

          <RightSidebar
            isCollapsed={isRightCollapsed}
            theme={theme}
            timelineSteps={timelineSteps}
            isThinking={isLoading}
            liveDemoMessages={deferredMessages}
            onToggleCollapse={toggleRightCollapse}
            toolOutputs={toolOutputs}
            sources={sources}
            isTransitioning={isThreadTransitioning}
          />
        </div>
      </div>
    </div>
  );

}
