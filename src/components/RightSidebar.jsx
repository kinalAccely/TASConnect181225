import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { FileText } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const resolveToolTitle = (tool, fallbackIndex) => {
  if (!tool || typeof tool !== "object") {
    return `Tool #${fallbackIndex + 1}`;
  }
  return (
    tool.title ??
    tool.name ??
    tool.toolName ??
    tool.tool_id ??
    `Tool #${fallbackIndex + 1}`
  );
};

const resolveToolBody = (tool) => {
  if (!tool || typeof tool !== "object") {
    return "";
  }
  if (typeof tool.content === "string") {
    return tool.content;
  }
  if (Array.isArray(tool.content)) {
    return tool.content.filter(Boolean).join("\n");
  }
  if (Array.isArray(tool.tokens)) {
    return tool.tokens.filter(Boolean).join("");
  }
  if (typeof tool.output === "string") {
    return tool.output;
  }
  if (typeof tool.result === "string") {
    return tool.result;
  }
  if (typeof tool.message === "string") {
    return tool.message;
  }
  return JSON.stringify(tool, null, 2);
};

const sanitizeBody = (body) => {
  if (typeof body !== "string") {
    return "";
  }
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }
  const braceCollapsed = trimmed.replace(/\s+/g, "");
  if (/^(?:\{\})+$/.test(braceCollapsed)) {
    return "";
  }
  return body;
};

const resolveSourceTitle = (source, index) => {
  if (!source || typeof source !== "object") {
    return `Source #${index + 1}`;
  }
  return source.title ?? source.name ?? source.id ?? `Source #${index + 1}`;
};

export default function RightSidebar({
  isCollapsed,
  liveDemoSteps,
  isThinking = false,
  onToggleCollapse,
  showDemoSteps,
  isTransitioning = false,
  liveDemoMessages = [],
  liveDemoTodos = [], // Accept Todos
  usedTools = [],
}) {
  const { user } = useAuth();
  const planEndRef = useRef(null);

  useEffect(() => {
    if (liveDemoTodos.length > 0 && planEndRef.current) {
      planEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [liveDemoTodos.length]);

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

  const hasDemoMessages = true;
  const [summaryLabel, setSummaryLabel] = useState('');
  const [summaryCount, setSummaryCount] = useState(10);
  // const hasSources = Array.isArray(sources) && sources.length > 0;
  const hasTools = Array.isArray(usedTools) && usedTools.length > 0;
  const demoStepCount = Array.isArray(liveDemoSteps) ? liveDemoSteps.length : 0;
  // const sourceCount = hasSources ? sources.length : 0;
  const shouldRender = showDemoSteps || hasTools;
  const headerLabel = React.useMemo(() => {
    if (showDemoSteps) {
      if (hasDemoMessages) {
        return "Live Demo Conversation";
      }
      return "Streaming Steps";
    }
    if (hasTools) return "Session Tools";
    // if (hasSources) return "Sources";
    return "Empty";
  }, [showDemoSteps, hasDemoMessages, hasTools]);

  if (!shouldRender) {
    return null;
  }

  const collapsedContent = (
    <div className="flex h-full w-full flex-col items-center justify-between py-4 overflow-hidden">
      <div className="flex flex-col items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.32em] text-zinc-400">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_6px_16px_rgba(15,23,42,0.12)]">
          <FileText size={16} />
        </span>
        <span className="block truncate max-w-[64px] text-center">{summaryLabel}</span>
      </div>
      {summaryCount > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-semibold text-zinc-800">{summaryCount}</span>
          <span className="text-[9px] uppercase tracking-[0.28em] text-zinc-400 block truncate max-w-[64px] text-center">
            {summaryLabel === "Streaming Steps" ? "Total" : summaryLabel === "Conversation" ? "Messages" : "Items"}
          </span>
        </div>
      )}
    </div>
  );

  const expandedContent = (
    <>
      <div className="flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md pb-2 pt-1 border-b border-zinc-100/50 mb-2">
        <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 select-none">
          <FileText size={12} className="text-[var(--brand)]" /> {headerLabel}
        </h2>
      </div>

      {showDemoSteps ? (
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">

          {/* PLAN / TODOS SECTION */}
          {liveDemoTodos.length > 0 && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-300"></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Plan</span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                <ul className="divide-y divide-zinc-50">
                  {liveDemoTodos.map((todo) => (
                    <li key={todo.id} className="relative px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="mt-1 block h-1 w-1 rounded-full bg-[var(--brand)] flex-shrink-0" />
                        <span>{typeof todo.content === 'string' ? todo.content : JSON.stringify(todo.content)}</span>
                      </div>
                    </li>
                  ))}
                  <div ref={planEndRef} />
                </ul>
              </div>
            </div>
          )}

          {/* THINKING INDICATOR */}
          {isThinking && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-light)]/30 bg-[var(--brand-lighter)]/50 px-3 py-2.5 text-zinc-600 shadow-sm animate-pulse">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand)]"></span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
                Thinking...
              </span>
            </div>
          )}
          {/* {liveDemoSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 shadow-inner shadow-orange-100/40"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))} */}
          {hasDemoMessages && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <div className="flex items-center gap-2 px-1 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-300"></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Log</span>
              </div>

              <div className="flex flex-col gap-2">
                {liveDemoMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`group relative flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-all duration-300 hover:shadow-md ${message.isUser
                      ? "border-[var(--brand-light)] bg-[var(--brand-lighter)] text-zinc-800 ml-4"
                      : "border-zinc-100 bg-white text-zinc-600 mr-1"
                      }`}
                  >
                    <div className="flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                      <span className={`text-[8px] font-bold uppercase tracking-[0.2em] ${message.isUser ? "text-[var(--brand)]" : "text-zinc-400"
                        }`}>
                        {message.role === 'user' ? 'You' : 'Preview'}
                      </span>
                    </div>
                    <div className="text-[11px] leading-relaxed break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                        className="prose prose-zinc max-w-none prose-p:my-0 prose-headings:my-1 prose-ul:my-1 prose-li:my-0"
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex max-h-[100vh] flex-col gap-2 overflow-y-auto pr-1 text-[11px]">
          {/* TOOLS SECTION */}
          {usedTools.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Used Tools
              </div>
              {usedTools.map((tool, index) => (
                <div
                  key={`${tool.id}-${index}`}
                  className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--brand)]">
                      {tool.name}
                    </span>
                    <span className="text-[9px] text-zinc-400">
                      {new Date(tool.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Optional: Show args if needed, or keep it simple */}
                  {/* <div className="text-[10px] text-zinc-500 truncate">
                      {JSON.stringify(tool.args)}
                    </div> */}
                </div>
              ))}
            </div>
          )}

          {/* LIVE DEMO MESSAGES (THINKING) */}
          {liveDemoMessages.length > 0 && (
            <div className="flex flex-col gap-3 mt-4">
              {liveDemoMessages
                .filter(msg => msg.role === 'assistant')
                .map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className="group flex flex-col gap-2 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Thinking Process
                      </span>
                    </div>
                    <div className="text-xs text-zinc-700 leading-relaxed prose prose-zinc max-w-none prose-p:my-1 prose-headings:my-2 prose-code:text-[10px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div
      className={`relative flex h-full min-h-0 transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
        }`}
    >
      <aside
        className={`flex h-full min-h-0 w-full flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/85 shadow-[0_16px_40px_rgba(17,17,17,0.08)] backdrop-blur-md transition-all duration-300 ease-in-out ${isCollapsed
          ? `items-center gap-3 px-2 py-4 ${isTransitioning ? "opacity-70 blur-[0.2px]" : "opacity-95"}`
          : `gap-4 p-5 ${isTransitioning ? "opacity-60 blur-[0.2px]" : "opacity-100"}`
          }`}
      >
        {isCollapsed ? collapsedContent : expandedContent}
      </aside>

      <button
        onClick={onToggleCollapse}
        className={`absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition duration-300 ease-in-out hover:border-orange-300 hover:text-orange-500 ${isCollapsed ? "top-1/2 left-[-18px] -translate-y-1/2" : "top-4 -left-4"
          }`}
        aria-label={isCollapsed ? "Expand right panel" : "Collapse right panel"}
      >
        {isCollapsed ? <IoChevronBack size={14} /> : <IoChevronForward size={14} />}
      </button>
    </div>
  );
}
