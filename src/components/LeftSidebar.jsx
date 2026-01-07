import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IoAdd,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";
import { fetchThreads } from "../services/threadService.js";
import { useNavigate } from "react-router-dom";

/* ---------------- helpers ---------------- */

const resolveThreadId = (thread) => {
  if (!thread || typeof thread !== "object") return null;
  return (
    thread.id ??
    thread.thread_id ??
    thread?.metadata?.id ??
    thread?.metadata?.thread_id ??
    null
  );
};

const resolveThreadLabel = (thread) => {
  if (!thread || typeof thread !== "object") return "Untitled Thread";
  return (
    thread.name ??
    thread.title ??
    thread?.metadata?.thread_name ??
    thread?.metadata?.name ??
    "Untitled Thread"
  );
};

/* ---------------- component ---------------- */

export default function LeftSidebar({
  isCollapsed,
  isLoading,
  refreshThread,
  theme = "light",
  onStartNewChat,
  onToggleTheme,
  onToggleCollapse,
  selectedChatId,
}) {
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [creating, setCreating] = useState(false);

  /* 🔒 scroll preservation */
  const historyRef = useRef(null);
  const scrollPosRef = useRef(0);

  /* ---------------- effects ---------------- */

  useEffect(() => {
    let isMounted = true;

    fetchThreads()
      .then((data) => {
        if (!isMounted) return;

        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.threads)
          ? data.threads
          : [];

        setThreads(normalized);
      })
      .catch((error) => {
        console.error("Failed to fetch threads for sidebar:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshThread]);

  /* save scroll */
  useEffect(() => {
    const el = historyRef.current;
    if (!el) return;

    const onScroll = () => {
      scrollPosRef.current = el.scrollTop;
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* restore scroll after selection change */
  useLayoutEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = scrollPosRef.current;
    }
  }, [selectedChatId]);

  /* ---------------- handlers ---------------- */

  const handleNavigate = (item) => {
    const targetId = resolveThreadId(item);
    if (!targetId) return;

    navigate(`/chat/${targetId}`, {
      state: {
        assistant_id: item.metadata?.graph_id,
        loadHistory: `load_${Date.now()}`,
      },
    });
  };

  const handleNewChat = () => {
    if (creating) return;
    setCreating(true);

    try {
      onStartNewChat?.();
      navigate("/chat");
    } finally {
      setTimeout(() => setCreating(false), 600);
    }
  };

  const hasThreads = threads.length > 0;

  /* ---------------- UI ---------------- */

  const collapsedContent = (
    <>
      <button
        onClick={handleNewChat}
        disabled={isLoading || creating}
        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-lg transition ${
          isLoading ? "cursor-not-allowed opacity-60" : "hover:scale-[1.03]"
        }`}
      >
        <IoAdd size={16} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[10px] uppercase tracking-[0.32em] text-zinc-400">
        <div className="h-14 w-px rounded-full bg-zinc-200" />
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white">
        U
      </div>
    </>
  );

  const expandedContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleNewChat}
          disabled={isLoading || creating}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] py-2 text-sm font-semibold text-white shadow-lg transition ${
            isLoading ? "cursor-not-allowed opacity-60" : "hover:scale-[1.02]"
          }`}
        >
          <IoAdd size={16} /> New
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
          History
        </h2>

        <div
          ref={historyRef}
          className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1 text-sm"
        >
          {!hasThreads ? (
            <p className="text-xs text-zinc-500/90">No conversations yet</p>
          ) : (
            threads.map((item) => {
              const id = resolveThreadId(item);
              if (!id) return null;

              const normalizedId = String(id);
              const isSelected = normalizedId === selectedChatId;

              return (
                <button
                  key={normalizedId} /* ✅ stable key */
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className={`rounded-2xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand-lighter)] text-black shadow"
                      : "border-transparent bg-zinc-50 text-zinc-600 hover:bg-[var(--brand-lighter)] hover:text-black"
                  }`}
                >
                  {resolveThreadLabel(item)}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 rounded-2xl border bg-zinc-50 px-3 py-2 text-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white">
          U
        </div>
        <div>
          <p className="font-semibold text-black">You</p>
          <p className="text-xs text-zinc-500">Workspace owner</p>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`relative flex h-[81%] transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <aside
        className={`flex h-full w-full flex-col rounded-3xl border bg-white/85 shadow backdrop-blur-md transition-all ${
          isCollapsed ? "items-center gap-6 px-3 py-4" : "gap-4 p-5"
        }`}
      >
        {isCollapsed ? collapsedContent : expandedContent}
      </aside>

      <button
        onClick={onToggleCollapse}
        className={`absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow transition ${
          isCollapsed
            ? "top-1/2 right-[-18px] -translate-y-1/2"
            : "top-4 -right-4"
        }`}
      >
        {isCollapsed ? (
          <IoChevronForward size={14} />
        ) : (
          <IoChevronBack size={14} />
        )}
      </button>
    </div>
  );
}
