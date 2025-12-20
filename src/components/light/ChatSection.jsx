import React, { useState, useMemo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import {
  IoSend,
  IoCopyOutline,
  IoCheckmark,
  IoStopCircleOutline,
  IoCloseCircle,
  IoLayersOutline,
  IoDownloadOutline,
  IoChatbubbleEllipsesOutline,
  IoPlayCircleOutline,
  IoSchoolOutline,
  IoSparklesOutline,
  IoArrowDownCircle
} from "react-icons/io5";

export default function ChatSection({
  chatBodyRef,
  input,
  isLoading,
  messages = [],
  onInputChange,
  onSend,
  onStop,
  onEditMessage,
  sandboxUrl,
  onAssistantSuggestionSelect,
  threadId,
  assistantId: propsAssistantId,
  currentAssistantId
}) {

  const lastRenderedSandboxUrlRef = React.useRef(null);
  const shouldRenderSandbox = sandboxUrl && sandboxUrl !== lastRenderedSandboxUrlRef.current;

  const normalizeSandboxUrl = (url) => {
    if (typeof url !== "string" || !url.trim()) return null;
    const trimmed = url.trim();
    try {
      const hasProto = /^https?:\/\//i.test(trimmed);
      const u = new URL(hasProto ? trimmed : `http://${trimmed}/vnc/index.html?autoconnect=true&resize=scale&reconnector=1&path=websockify`);
      if (u.hostname === "localhost" && SANDBOX_HOST) {
        u.hostname = SANDBOX_HOST;
        u.protocol = "http:";
      }
      return u.toString();
    } catch {
      return trimmed;
    }
  };

  const slashOptions = [
    { id: "agent", label: "Chat", icon: <IoChatbubbleEllipsesOutline size={18} />, description: "Standard conversation mode" },
    { id: "training_module_graph", label: "Training", icon: <IoSchoolOutline size={18} />, description: "Generate educational content" },
    { id: "live_demo", label: "Live Demo", icon: <IoPlayCircleOutline size={18} />, description: "Interact with a live sandbox" },
  ];

  useEffect(() => {
    if (currentAssistantId) {
      const matched = slashOptions.find(opt => opt.id === currentAssistantId);
      if (matched) {
        setActiveModule(matched);
      }
    }
  }, [currentAssistantId]);

  const isNewChatRoute = useMemo(() => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    return pathSegments.length === 1 && pathSegments[0] === 'chat' && !threadId;
  }, [window.location.pathname, threadId]);

  const [activeModule, setActiveModule] = useState(() =>
    isNewChatRoute ? slashOptions[0] : null
  );

  const [copiedMessageKey, setCopiedMessageKey] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isNewChatRoute && propsAssistantId) {
      const matched = slashOptions.find(opt => opt.id === propsAssistantId);
      if (matched) setActiveModule(matched);
    }
  }, [propsAssistantId, isNewChatRoute]);

  useEffect(() => {
    if (!activeModule) {
      onAssistantSuggestionSelect?.(slashOptions[0]);
      setActiveModule(slashOptions[0]);
    }
  }, [activeModule]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageKey(key);
    setTimeout(() => setCopiedMessageKey(null), 2000);
  };

  const triggerDownload = (msg) => {
    const blob = new Blob([msg.text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `training_content_${new Date().getTime()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const showSlashMenu = isNewChatRoute && messages.length === 0 && input.startsWith("/");
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSelectModule = (module) => {
    setActiveModule(module);
    onAssistantSuggestionSelect?.(module);
    onInputChange("");
  };

  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const chatContainer = chatBodyRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const isNearBottom =
        chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 300;
      setShowScrollButton(!isNearBottom);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [chatBodyRef]);

  const markdownComponents = {
    p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
    ul: ({ node, ...props }) => <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />,
    ol: ({ node, ...props }) => <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900" {...props} />,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50">

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-8 z-50 flex items-center justify-center
                   bg-white text-[var(--brand)] rounded-full p-2 shadow-lg border
                   border-zinc-200 hover:bg-zinc-50 transition-all animate-bounce"
          aria-label="Scroll to bottom"
        >
          <IoArrowDownCircle size={30} />
        </button>
      )}

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">

        <div
          ref={chatBodyRef}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-6 scroll-smooth"
        >
          {isNewChatRoute && messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-700">
              <div className="mb-4 p-4 bg-zinc-50 rounded-full text-[var(--brand)]">
                <IoSparklesOutline size={32} className="animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-800 mb-2">
                Start a new conversation
              </h2>
              <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                Ask a question or type{" "}
                <span className="font-mono text-[var(--brand)] font-bold">/</span>{" "}
                to switch modes.
              </p>
            </div>
          )}

          {!isNewChatRoute && messages.length === 0 && isLoading && (
            <div className="flex flex-col gap-4 p-4 animate-pulse">
              <div className="h-10 bg-zinc-100 rounded-2xl w-2/3 self-start" />
              <div className="h-10 bg-zinc-100 rounded-2xl w-1/2 self-end" />
              <div className="h-32 bg-zinc-100 rounded-2xl w-full" />
            </div>
          )}

          {/* Updated CHAT MESSAGES LOGIC */}
          {messages.map((msg, idx) => {
            console.log(msg);
            const isUser = msg.role === "user";
            const msgId = msg.id || `msg-${idx}`;

            const currentMsgAssistantId =
              msg.assistant_id || propsAssistantId || activeModule?.id;

            const isTrainingModule =
              currentMsgAssistantId === "training_module_graph";

            // ✅ normalize sandbox from props
            const normalizedSandbox =
              sandboxUrl ? normalizeSandboxUrl(sandboxUrl) : null;

            /* ================= USER MESSAGE ================= */
            if (isUser) {
              return (
                <div key={msgId} className="flex w-full justify-end mt-[5px]">
                  <div className="group relative max-w-[75%] rounded-2xl border border-[var(--brand-light)] bg-[var(--brand-lighter)] px-4 py-3 text-[13px] text-zinc-800 shadow-sm">
                    <button
                      onClick={() => handleCopy(msg.text, msgId)}
                      className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-medium
              text-zinc-400 hover:text-[var(--brand)]
              opacity-0 group-hover:opacity-100
              pointer-events-none group-hover:pointer-events-auto
              transition-opacity duration-200"
                    >
                      {copiedMessageKey === msgId ? (
                        <IoCheckmark size={14} className="text-green-500" />
                      ) : (
                        <IoCopyOutline size={14} />
                      )}
                    </button>

                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            }

            /* ================= ASSISTANT / TRAINING ================= */
            return (
              <div key={msgId} className="flex flex-col gap-4">

                {/* ✅ SANDBOX — render once, don’t block message */}
                {normalizedSandbox &&
                  lastRenderedSandboxUrlRef.current !== normalizedSandbox && (
                    <div className="w-full h-[400px] border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                      <iframe
                        src={normalizedSandbox}
                        title="Live Sandbox"
                        className="w-full h-full"
                        allowFullScreen
                        onLoad={() => {
                          // 🔥 mark sandbox as rendered
                          lastRenderedSandboxUrlRef.current = normalizedSandbox;
                        }}
                      />
                    </div>
                  )}

                <div
                  className={`${isTrainingModule
                    ? "w-full max-w-5xl mx-auto"
                    : "max-w-[85%]"
                    } flex flex-col gap-2`}
                >
                  {isTrainingModule && (
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Training Canvas
                      </span>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleCopy(msg.text, msgId)}
                          className="text-[11px] font-medium text-zinc-500 hover:text-[var(--brand)] flex items-center gap-1"
                        >
                          {copiedMessageKey === msgId ? (
                            <IoCheckmark size={14} className="text-green-500" />
                          ) : (
                            <IoCopyOutline size={14} />
                          )}
                          {copiedMessageKey === msgId ? "Copied" : "Copy"}
                        </button>

                        <button
                          onClick={() => triggerDownload(msg)}
                          className="text-[11px] font-medium text-zinc-500 hover:text-[var(--brand)] flex items-center gap-1"
                        >
                          <IoDownloadOutline size={14} /> Download
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`${isTrainingModule
                      ? "group min-h-[300px] border-2 bg-zinc-50/30 p-8 shadow-inner"
                      : "group bg-white border px-5 py-4 shadow-sm"
                      } rounded-2xl border-zinc-200 text-[13.5px] text-zinc-700 relative`}
                  >
                    <button
                      onClick={() => handleCopy(msg.text, msgId)}
                      className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-medium
              text-zinc-400 hover:text-[var(--brand)]
              opacity-0 group-hover:opacity-100
              pointer-events-none group-hover:pointer-events-auto
              transition-opacity duration-200"
                    >
                      {copiedMessageKey === msgId ? (
                        <IoCheckmark size={14} className="text-green-500" />
                      ) : (
                        <IoCopyOutline size={14} />
                      )}
                    </button>

                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.text || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}


          {isLoading && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                </div>
                <span className="text-[12px] font-medium text-zinc-400 italic">
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {showSlashMenu && (
          <div className="absolute bottom-20 left-6 w-[300px] bg-white border border-zinc-200 rounded-xl shadow-lg z-50 p-2">
            {slashOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelectModule(option)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 cursor-pointer"
              >
                {option.icon}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-zinc-400">{option.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-100 bg-white p-4">
          <div className="relative flex flex-col gap-2 rounded-2xl bg-zinc-50 p-2">
            <div className="flex items-start gap-2">
              {activeModule && activeModule.id !== "agent" && (
                <div className="flex items-center gap-1.5 bg-[var(--brand)] text-white px-2.5 py-2 rounded-xl text-[11px] font-bold shadow-sm">
                  <IoLayersOutline size={14} />
                  <span className="max-w-[90px] truncate">
                    {activeModule.label}
                  </span>
                  {!threadId && (
                    <button onClick={() => setActiveModule(null)}>
                      <IoCloseCircle size={15} />
                    </button>
                  )}
                </div>
              )}

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), onSend())
                }
                placeholder={
                  isNewChatRoute && messages.length === 0
                    ? "Type / to change mode..."
                    : "Reply..."
                }
                className="flex-1 resize-none text-sm py-2.5 px-2 min-h-[44px] max-h-[200px]"
              />

              <button
                onClick={isLoading ? onStop : onSend}
                className="self-end mb-1 p-2.5 bg-[var(--brand)] text-white rounded-xl shadow-lg"
              >
                {isLoading ? (
                  <IoStopCircleOutline size={22} />
                ) : (
                  <IoSend size={22} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
