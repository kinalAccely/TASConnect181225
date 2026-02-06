import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IoAdd,
  IoChevronBack,
  IoChevronForward,
  IoChevronDown,
  IoLogOutOutline,
  IoEllipsisVertical
} from "react-icons/io5";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { fetchThreads, deleteThread, updateThread } from "../services/threadService.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
  loadHistoryToggle,
  onToggleCollapse,
  selectedChatId,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [threads, setThreads] = useState([]);
  const [creating, setCreating] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // Debug: Log user data
  useEffect(() => {
    console.log('Current user data:', user);
  }, [user]);

  /* 🔒 scroll preservation */
  const historyRef = useRef(null);
  const scrollPosRef = useRef(0);
  const threadRefs = useRef(new Map());

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.history-menu-trigger') && !e.target.closest('.history-menu-dropdown')) {
        setActiveMenuId(null);
      }
      if (!e.target.closest('.user-menu-trigger') && !e.target.closest('.user-menu-dropdown')) {
        setShowUserMenu(false);
      }
    };
    document['addEventListener']('mousedown', handleClickOutside);
    return () => document['removeEventListener']('mousedown', handleClickOutside);
  }, []);

  /* restore scroll after selection change */
  useLayoutEffect(() => {
    const listEl = historyRef.current;
    if (!listEl) return;

    const normalizedId = selectedChatId ? String(selectedChatId) : undefined;
    const selectedEl = normalizedId
      ? threadRefs.current.get(normalizedId)
      : undefined;

    if (!selectedEl) {
      listEl.scrollTop = scrollPosRef.current;
      return;
    }

    const listTop = listEl.scrollTop;
    const listBottom = listTop + listEl.clientHeight;
    const nodeTop = selectedEl.offsetTop;
    const nodeBottom = nodeTop + selectedEl.offsetHeight;

    if (nodeTop < listTop) {
      listEl.scrollTo({ top: nodeTop, behavior: "smooth" });
    } else if (nodeBottom > listBottom) {
      listEl.scrollTo({
        top: nodeBottom - listEl.clientHeight,
        behavior: "smooth",
      });
    } else {
      listEl.scrollTop = scrollPosRef.current;
    }
  }, [selectedChatId]);

  /* ---------------- handlers ---------------- */

  const handleNavigate = (item) => {
    const targetId = resolveThreadId(item);
    if (!targetId || targetId === selectedChatId) return;
    loadHistoryToggle?.();
    navigate(`/chat/${targetId}`);
  };

  const handleDeleteChat = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        await deleteThread(id);
        const updatedThreads = threads.filter(t => resolveThreadId(t) !== id);
        setThreads(updatedThreads);
        if (selectedChatId === id) {
          navigate("/chat");
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
      }
    }
    setActiveMenuId(null);
  };

  const handleStartRename = (e, item) => {
    e.stopPropagation();
    const id = resolveThreadId(item);
    setEditingId(id);
    setEditTitle(resolveThreadLabel(item));
    setActiveMenuId(null);
  };

  const handleFinishRename = async (id) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await updateThread(id, { thread_name: editTitle });
      const updatedThreads = threads.map(t => {
        if (resolveThreadId(t) === id) {
          return {
            ...t,
            metadata: { ...t.metadata, thread_name: editTitle }
          };
        }
        return t;
      });
      setThreads(updatedThreads);
    } catch (error) {
      console.error("Failed to update thread:", error);
    }
    setEditingId(null);
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const name = user.display_name || user.username || 'User';
    return name.charAt(0).toUpperCase();
  };

  const hasThreads = threads.length > 0;

  /* ---------------- UI ---------------- */

  const collapsedContent = (
    <>
      <button
        onClick={handleNewChat}
        disabled={isLoading || creating}
        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-lg transition ${isLoading ? "cursor-not-allowed opacity-60" : "hover:scale-[1.03]"
          }`}
      >
        <IoAdd size={16} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[10px] uppercase tracking-[0.32em] text-zinc-400">
        <div className="h-14 w-px rounded-full bg-zinc-200" />
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white font-semibold">
        {getUserInitials()}
      </div>
    </>
  );

  const expandedContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleNewChat}
          disabled={isLoading || creating}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] py-2 text-sm font-semibold text-white shadow-lg transition ${isLoading ? "cursor-not-allowed opacity-60" : "hover:scale-[1.02]"
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
              const isEditing = editingId === normalizedId;

              return (
                <div
                  key={normalizedId}
                  className="relative group w-full"
                >
                  <button
                    type="button"
                    onClick={() => handleNavigate(item)}
                    ref={(node) => {
                      if (!node) {
                        threadRefs.current.delete(normalizedId);
                        return;
                      }
                      threadRefs.current.set(normalizedId, node);
                    }}
                    className={`w-full rounded-2xl border px-3 py-2 text-left transition-all flex items-center justify-between ${isSelected
                      ? "border-[var(--brand)] bg-[var(--brand-lighter)] text-black shadow"
                      : "border-transparent bg-zinc-50 text-zinc-600 hover:bg-[var(--brand-lighter)] hover:text-black"
                      }`}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleFinishRename(normalizedId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(normalizedId);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-sm p-0 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate flex-1 pr-1">
                        {resolveThreadLabel(item)}
                      </span>
                    )}

                    {!isCollapsed && !isEditing && (
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === normalizedId ? null : normalizedId);
                          }}
                          className={`p-1 rounded-lg hover:bg-black/5 transition-opacity history-menu-trigger ${isSelected || activeMenuId === normalizedId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <IoEllipsisVertical size={14} className="text-zinc-400 hover:text-zinc-600" />
                        </button>
                      </div>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuId === normalizedId && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border bg-white shadow-xl py-1 overflow-hidden history-menu-dropdown">
                      <button
                        onClick={(e) => handleStartRename(e, item)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <FiEdit2 size={12} />
                        Rename
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(e, normalizedId)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FiTrash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-auto relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 rounded-2xl border bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100 transition-colors user-menu-trigger"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white font-semibold">
            {getUserInitials()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-semibold text-black truncate">
              {user?.display_name || user?.username || 'User'}
            </p>
            {user?.email && user?.email !== (user?.display_name || user?.username) && (
              <p className="text-xs text-zinc-500 truncate">
                {user?.email}
              </p>
            )}
          </div>
          <IoChevronDown className={`text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} size={16} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border bg-white shadow-lg overflow-hidden user-menu-dropdown">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <IoLogOutOutline size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`relative flex flex-1 min-h-0 transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"
        }`}
    >
      <aside
        className={`flex h-full w-full flex-col rounded-3xl border bg-white/85 shadow backdrop-blur-md transition-all ${isCollapsed ? "items-center gap-6 px-3 py-4" : "gap-4 p-5"
          }`}
      >
        {isCollapsed ? collapsedContent : expandedContent}
      </aside>

      <button
        onClick={onToggleCollapse}
        className={`absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow transition ${isCollapsed
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
