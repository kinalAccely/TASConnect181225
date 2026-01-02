import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { useLocation } from "react-router-dom";
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
  handleSubmit,
  isStreamNewChat,
  messages = [],
  onInputChange,
  newStreamingList,
  onStop,
  onEditMessage,
  sandboxUrl,
  onAssistantSuggestionSelect,
  threadId,
  updatedevents,
  assistantId: propsAssistantId,
  currentAssistantId
}) {
  const lastRenderedSandboxUrlRef = useRef(null);
  const shouldRenderSandbox = sandboxUrl && sandboxUrl !== lastRenderedSandboxUrlRef.current;
  const [sandboxUrlLink, setSandBoxUrl] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (sandboxUrl) {
      setSandBoxUrl(sandboxUrl);
    }
  }, [sandboxUrl])
  const [updateEventKey, setUpdateEventKey] = useState([]);
  const normalizeSandboxUrl = (url) => {
    if (typeof url !== "string" || !url.trim()) return null;
    const trimmed = url.trim();
    try {
      const hasProto = /^https?:\/\//i.test(trimmed);
      const u = `${trimmed}/vnc/index.html?autoconnect=true&resize=scale&reconnector=1&path=websockify`;
      // if (u.hostname === "localhost") {
      //   u.hostname = SANDBOX_HOST;
      //   u.protocol = "http:";
      // }
      return u;
    } catch {
      return trimmed;
    }
  };

  const slashOptions = [
    { id: "agent", label: "Chat", icon: <IoChatbubbleEllipsesOutline size={18} />, description: "Standard conversation mode" },
    { id: "training_module_graph", label: "Training", icon: <IoSchoolOutline size={18} />, description: "Generate educational content" },
    { id: "live_demo", label: "Live Demo", icon: <IoPlayCircleOutline size={18} />, description: "Interact with a live sandbox" },
  ];

  const handleDownload = useCallback((content) => {
  if (!content) return;

  let formattedContent = content

    /* ---------- HEADINGS ---------- */
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')

    /* ---------- HORIZONTAL RULE ---------- */
    .replace(/^\s*---\s*$/gm, '<hr />')

    /* ---------- BOLD ---------- */
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')

    /* ---------- TABLES (GFM) ---------- */
    // Convert table header row
    .replace(
      /^\|(.+)\|\n\|([-\s|:]+)\|\n((?:\|.*\|\n?)*)/gm,
      (_, header, _sep, body) => {
        const headers = header
          .split('|')
          .map(h => `<th>${h.trim()}</th>`)
          .join('');

        const rows = body
          .trim()
          .split('\n')
          .map(row => {
            const cells = row
              .replace(/^\||\|$/g, '')
              .split('|')
              .map(c => `<td>${c.trim()}</td>`)
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

        return `
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }
    )

    /* ---------- BULLET LISTS ---------- */
    .replace(/^\s*[-•]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

    /* ---------- PARAGRAPHS ---------- */
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, ' ');

  formattedContent = `<p>${formattedContent}</p>`;

  /* ---------- WORD-FRIENDLY CSS ---------- */
  const cssStyles = `
    <style>
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #334155;
        line-height: 1.6;
        padding: 40px;
      }

      h1 {
        font-size: 22px;
        font-weight: 700;
        margin: 24px 0 12px;
        color: #0f172a;
      }

      h2 {
        font-size: 18px;
        font-weight: 600;
        margin: 20px 0 10px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        color: #0f172a;
      }

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 16px 0 8px;
        color: #1f2937;
      }

      p {
        margin-bottom: 12px;
      }

      hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 24px 0;
      }

      ul {
        margin: 8px 0 12px 20px;
        padding-left: 16px;
      }

      li {
        margin-bottom: 6px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 13px;
      }

      th, td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f1f5f9;
        font-weight: 600;
        color: #0f172a;
      }

      b {
        font-weight: 600;
        color: #0f172a;
      }
    </style>
  `;

  /* ---------- WORD HTML WRAPPER ---------- */
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        ${cssStyles}
      </head>
      <body>
        ${formattedContent}
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workspace_export_${Date.now()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}, []);




  useEffect(() => {
    if (currentAssistantId) {
      const matched = slashOptions.find(opt => opt.id === currentAssistantId);
      if (matched) {
        setActiveModule(matched);
      }
    }
  }, [currentAssistantId]);

  useEffect(() => {
    setUpdateEventKey(Object.keys(updatedevents));
  }, [updatedevents])

  const isNewChat = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    return pathSegments.length === 1 && pathSegments[0] === 'chat' && !threadId;
  }, [location.pathname, threadId]);

  const [activeModule, setActiveModule] = useState(() =>
    isStreamNewChat ? slashOptions[0] : null
  );

  const [copiedMessageKey, setCopiedMessageKey] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isNewChat && propsAssistantId) {
      const matched = slashOptions.find(opt => opt.id === propsAssistantId);
      if (matched) setActiveModule(matched);
    } else {
      setShowScrollButton(false);
    }
  }, [propsAssistantId, isNewChat]);

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const showSlashMenu = isStreamNewChat && newStreamingList.length === 0 && input.startsWith("/");
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
  /* ---------- HEADINGS ---------- */
  h1: ({ node, ...props }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 text-zinc-900" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xl font-semibold mb-3 mt-5 text-zinc-900 border-b pb-1" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 text-zinc-800" {...props} />
  ),

  /* ---------- TEXT ---------- */
  p: ({ node, ...props }) => (
    <p className="mb-3 last:mb-0 leading-relaxed text-zinc-700" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-zinc-900" {...props} />
  ),

  /* ---------- LISTS ---------- */
  ul: ({ node, ...props }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="pl-1 text-zinc-700" {...props} />
  ),

  /* ---------- TABLES (FIX) ---------- */
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border border-zinc-200 rounded-lg border-collapse text-sm"
        {...props}
      />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-zinc-100" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-zinc-200" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="hover:bg-zinc-50" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th
      className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-900"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td
      className="border border-zinc-200 px-3 py-2 text-zinc-700 align-top"
      {...props}
    />
  ),
};



  const normalizedSandbox =
    sandboxUrl ? normalizeSandboxUrl(sandboxUrl) : null;

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
          {isStreamNewChat && newStreamingList.length === 0 && !isLoading && (
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

          {!isStreamNewChat && newStreamingList.length === 0 && isLoading && (
            <div className="flex flex-col gap-4 p-4 animate-pulse">
              <div className="h-10 bg-zinc-100 rounded-2xl w-2/3 self-start" />
              <div className="h-10 bg-zinc-100 rounded-2xl w-1/2 self-end" />
              <div className="h-32 bg-zinc-100 rounded-2xl w-full" />
            </div>
          )}

          {/* ================= CHAT MESSAGES ================= */}
          {newStreamingList.map((msg, idx) => {
            const msgId = msg.id || `msg-${idx}`;
            const isUser = (msg.role === "user" || msg.role === "human");

            const currentAssistantId =
              msg.assistant_id || propsAssistantId || activeModule?.id;

            const isTrainingModule =
              currentAssistantId === "training_module_graph";

            const isAgent = currentAssistantId === "agent";
            const isLiveDemo = activeModule?.id === "live_demo";

            /* ================= COPY BUTTON ================= */
            const CopyIconButton = ({ className }) => (
              <button
                onClick={() => handleCopy(msg.text, msgId)}
                className={className}
              >
                {copiedMessageKey === msgId ? (
                  <IoCheckmark size={14} className="text-green-500" />
                ) : (
                  <IoCopyOutline size={14} />
                )}
              </button>
            );


            /* ================= USER MESSAGE ================= */
            if (isUser) {
              return (
                <div key={msgId} className="flex w-full justify-end mt-[5px]">
                  <div className="group relative max-w-[75%] rounded-2xl border border-[var(--brand-light)] bg-[var(--brand-lighter)] px-4 py-3 text-[13px] text-zinc-800 shadow-sm">
                    <CopyIconButton
                      className="absolute top-2 right-2 flex items-center gap-1 text-[11px]
              text-zinc-400 hover:text-[var(--brand)]
              opacity-0 group-hover:opacity-100
              pointer-events-none group-hover:pointer-events-auto
              transition-opacity duration-200"
                    />

                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            /* ================= ASSISTANT ================= */

            return (
              <div key={msgId} className="flex flex-col gap-4">
                <div
                  className={`flex flex-col gap-2 ${isTrainingModule
                    ? "w-full max-w-5xl mx-auto"
                    : "max-w-[85%]"
                    }`}
                >
                  {/* ===== HEADER ACTIONS ===== */}
                  {(isTrainingModule || isAgent) && (
                    <div className="flex items-center justify-end px-2 gap-4">
                      {/* Training → copy + download */}
                      {isTrainingModule && (
                        <>
                          <button
                            onClick={() => handleCopy(msg.content, msgId)}
                            className="text-[11px] font-medium text-zinc-500 hover:text-[var(--brand)]
                    flex items-center gap-1"
                          >
                            {copiedMessageKey === msgId ? (
                              <IoCheckmark size={14} className="text-green-500" />
                            ) : (
                              <IoCopyOutline size={14} />
                            )}
                            {copiedMessageKey === msgId ? "Copied" : "Copy"}
                          </button>

                          <button
                            onClick={() => handleDownload(msg.content)}
                            className="text-[11px] font-medium text-zinc-500 hover:text-[var(--brand)]
                    flex items-center gap-1"
                          >
                            <IoDownloadOutline size={14} /> Download
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* ===== MESSAGE BODY ===== */}
                  <div
                    className={`group relative rounded-2xl border border-zinc-200 text-[13.5px] text-zinc-700 ${isTrainingModule
                      ? "min-h-[300px] border-2 bg-zinc-50/30 p-8 shadow-inner"
                      : "bg-white px-5 py-4 shadow-sm"
                      }`}
                  >
                    {!isTrainingModule && (<CopyIconButton
                      className="absolute top-2 right-2 text-zinc-400 hover:text-[var(--brand)]
                          opacity-0 group-hover:opacity-100
                          pointer-events-none group-hover:pointer-events-auto
                          transition-opacity duration-200"
                    />)
                    }

                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.content || ""}
                    </ReactMarkdown>

                    {/* {msg.isStreaming && (
                      <span className="inline-block ml-1 animate-pulse text-zinc-400">
                        ▍
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
            );
          })}


          {sandboxUrlLink && activeModule.id == 'live_demo' && !isStreamNewChat && (
            <div className="w-full h-[400px] border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <iframe
                src={normalizeSandboxUrl(sandboxUrlLink)}
                title="Live Sandbox"
                className="w-full h-full"
                style={{ pointerEvents: 'none' }}
                allowFullScreen
                onLoad={() => {
                  // 🔥 mark sandbox as rendered
                  lastRenderedSandboxUrlRef.current = normalizedSandbox;
                }}
              />
            </div>
          )}


          {isLoading && newStreamingList.length > 0 && (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();

                    if (!isLoading) {
                      handleSubmit();
                    }
                  }
                }}
                placeholder={
                  isStreamNewChat && newStreamingList.length === 0
                    ? "Type / to change mode..."
                    : "Reply..."
                }
                className="flex-1 resize-none text-sm py-2.5 px-2 min-h-[44px] max-h-[200px]"
              />


              <button
                onClick={isLoading ? onStop : handleSubmit}
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
