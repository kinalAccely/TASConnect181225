import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { FileText } from "lucide-react";

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
  sources,
  toolOutputs = [],
  isTransitioning = false,
  liveDemoMessages = [],
}) {
  const markdownComponents = React.useMemo(
    () => ({
      a: ({ node, ...props }) => (
        <a
          {...props}
          className="font-semibold text-[var(--brand)] underline decoration-[var(--brand)] decoration-2 underline-offset-2"
          target="_blank"
          rel="noreferrer"
        />
      ),
      code({ inline, className, children, ...props }) {
        if (inline) {
          return (
            <code
              className={`rounded bg-black/10 px-1 py-[0.1rem] font-mono text-[0.85em] ${className ?? ""}`}
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-950/95 p-3 text-zinc-100 shadow-inner">
            <code className="font-mono text-[0.85em]" {...props}>
              {children}
            </code>
          </pre>
        );
      },
    }),
    [],
  );

  const prevToolKeysRef = React.useRef(new Set());
  const [recentToolKeys, setRecentToolKeys] = React.useState([]);

  React.useEffect(() => {
    const currentKeys = Array.isArray(toolOutputs)
      ? toolOutputs
        .map((tool, index) => tool?.__key ?? tool?.id ?? `tool-${index}`)
        .filter(Boolean)
      : [];

    const prevKeys = prevToolKeysRef.current;
    const addedKeys = currentKeys.filter((key) => !prevKeys.has(key));
    prevToolKeysRef.current = new Set(currentKeys);

    if (addedKeys.length > 0) {
      setRecentToolKeys(addedKeys);
      const timer = setTimeout(() => {
        setRecentToolKeys([]);
      }, 350);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [toolOutputs]);

  const toolCards = React.useMemo(() => {
    if (!Array.isArray(toolOutputs)) {
      return [];
    }
    return toolOutputs.reduce((acc, tool, index) => {
      const key = tool?.__key ?? tool?.id ?? `tool-${index}`;
      const title = resolveToolTitle(tool, index);
      const body = sanitizeBody(resolveToolBody(tool));
      if (!body) {
        return acc;
      }
      // if(title?.toLowerCase() == 'write_todos'){
        acc.push({
          key,
          title,
          body,
        });
        return acc;
      // }
    }, []);
  }, [toolOutputs]);

  const demoMessages = React.useMemo(() => {
    if (!Array.isArray(liveDemoMessages)) {
      return [];
    }

    return liveDemoMessages
      .map((message, index) => {
        if (!message || typeof message !== "object") {
          return null;
        }
        const text =
          typeof message.text === "string" ? message.text.trim() : "";
        if (!text) {
          return null;
        }
        const role =
          typeof message.role === "string" ? message.role.trim() : "assistant";
        const normalizedRole = role.toLowerCase();
        const isUser = normalizedRole === "user";
        const roleLabel = isUser
          ? "You"
          : normalizedRole === "assistant"
            ? "Assistant"
            : normalizedRole === "system"
              ? "System"
              : normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);

        const key =
          typeof message.id === "string" || typeof message.id === "number"
            ? message.id
            : `message-${index}`;

        return {
          key,
          text,
          isUser,
          roleLabel,
        };
      })
      .filter(Boolean);
  }, [liveDemoMessages]);

  const hasToolOutputs = toolCards?.length > 0;
  const hasDemoMessages = demoMessages.length > 0;
  const hasSources = Array.isArray(sources) && sources.length > 0;
  const demoStepCount = Array.isArray(liveDemoSteps) ? liveDemoSteps.length : 0;
  const sourceCount = hasSources ? sources.length : 0;
  const summaryLabel = showDemoSteps
    ? hasDemoMessages
      ? "Conversation"
      : "Streaming Steps"
    : hasToolOutputs
      ? "Outputs"
      : hasSources
        ? "Sources"
        : "Empty";
  const summaryCount = showDemoSteps
    ? hasDemoMessages
      ? demoMessages.length
      : demoStepCount
    : hasToolOutputs
      ? toolCards.length
      : hasSources
        ? sourceCount
        : 0;
  const shouldRender = showDemoSteps || hasToolOutputs || hasSources;
  const headerLabel = React.useMemo(() => {
    // if (showDemoSteps) {
    //   if (hasDemoMessages) {
    //     return "Live Demo Conversation";
    //   }
    //   return "Streaming Steps";
    // }
    if (hasToolOutputs) {
      return "Tool Output";
    }
    if (hasSources) {
      return "Sources";
    }
    return "Empty";
  }, [showDemoSteps, hasDemoMessages, hasToolOutputs, hasSources]);

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
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
          <FileText size={14} /> {headerLabel}
        </h2>
      </div>

      {showDemoSteps ? (
        <div className="mt-2 flex max-h-[100vh] flex-col gap-2 overflow-y-auto pr-1 text-[12px]">
          {isThinking && (
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-500 shadow-inner shadow-orange-100/40">
              <span className="h-2 w-2 animate-ping rounded-full bg-[var(--brand)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Thinking
              </span>
            </div>
          )}
          {liveDemoSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 shadow-inner shadow-orange-100/40"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}

          {hasDemoMessages && (
            <div className="mt-3 flex flex-col gap-2 text-[11px]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Conversation
              </div>
              {demoMessages.map((message) => (
                <div
                  key={message.key}
                  className={`rounded-2xl border border-zinc-200 px-3 py-2 shadow-inner shadow-orange-100/35 transition-all duration-300 ${message.isUser
                    ? "bg-[var(--brand-lighter)] text-[var(--brand-dark)]"
                    : "bg-white text-zinc-600"
                    }`}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                    {message.roleLabel}
                  </div>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="mt-1 space-y-1 break-words"
                    components={markdownComponents}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : hasToolOutputs ? (
        <div className="mt-2 flex max-h-[100vh] flex-col gap-2 overflow-y-auto pr-1 text-[11px]">
          {toolCards.map((tool) => {
            const isNew = recentToolKeys.includes(tool.key);

            // ✅ SAFE PARSE (supports string or array)
            let todos = [];
            if (tool.body) {
              try {
                todos =
                  typeof tool.body === "string"
                    ? JSON.parse(tool.body)['todos']
                    : tool.body.todos;
              } catch (e) {
                console.error("Invalid todos JSON", e);
              }
            }

            return (
              <div
                key={tool.key}
                className={`rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 shadow-inner shadow-orange-100/30 transition-all duration-300 ease-out ${isNew ? "fade-slide-in" : ""
                  }`}
              >
                {/* TITLE */}
                <div key={`${tool.key}key`} className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  {tool.title}
                </div>

                {/* BODY */}
                <div className="mt-1 font-mono text-[11px] text-zinc-600 whitespace-pre-wrap break-words">
                  {Array.isArray(todos) && todos.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1">
                      {todos.map((todo, idx) => (
                        <li key={idx} className="break-words">
                          {todo.content}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        <div className="mt-2 flex max-h-[100vh] flex-col gap-2 overflow-y-auto pr-1 text-[11px]">
          {sources.map((source, index) => (
            <div
              key={source?.__key ?? source?.id ?? `${index}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-zinc-600 shadow-inner shadow-orange-100/30"
            >
              <span>{resolveSourceTitle(source, index)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                #{index + 1}
              </span>
            </div>
          ))}
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
