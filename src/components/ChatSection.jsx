import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { streamLiveScreen } from "../services/threadService";
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
  IoArrowDownCircle,
  IoArrowUpCircle
} from "react-icons/io5";


import SourceTooltip from "./SourceTooltip";
// import { ThinkingIndicator } from "./ThinkingIndicators";

/* ---------- CODE BLOCK COMPONENT ---------- */
const CodeBlock = ({ children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  const handleCopy = () => {
    if (preRef.current) {
      const text = preRef.current.innerText || "";
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="relative group my-4 rounded-lg bg-zinc-900 border border-zinc-800">
      <div className="absolute top-2 right-2 flex items-center justify-end z-10">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? <IoCheckmark size={16} className="text-green-500" /> : <IoCopyOutline size={16} />}
        </button>
      </div>
      <pre
        ref={preRef}
        className="overflow-x-auto p-4 text-sm text-white font-mono scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-transparent"
        {...props}
      >
        {children}
      </pre>
    </div>
  );
};

export default function ChatSection({
  chatBodyRef,
  toolCalls,
  input,
  isLoading,
  hideLiveScreen,
  customStates,
  handleSubmit,
  isStreamNewChat,
  messages = [],
  onInputChange,
  newStreamingList,
  onStop,
  onEditMessage,
  assignTask,
  doneBrowser,
  onAssistantSuggestionSelect,
  threadId,
  assistantId: propsAssistantId,
  currentAssistantId
}) {
  const isAtBottomRef = useRef(true);
  const location = useLocation();

  useEffect(() => {
    setIsLiveConnected(false);
  }, [doneBrowser])
  const [updateEventKey, setUpdateEventKey] = useState([]);
  const [showLiveScreen, setShowLiveScreen] = useState(false);
  const [liveImageSrc, setLiveImageSrc] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const liveScreenConnectedRef = useRef(false);

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



  /* ---------- SLASH OPTIONS ---------- */
  const slashOptions = useMemo(() => [
    // { id: "agent", label: "Chat", icon: <IoChatbubbleEllipsesOutline size={18} />, description: "Standard conversation mode" },
    { id: "agent", label: "Training", icon: <IoSchoolOutline size={18} />, description: "Generate educational content" },
    { id: "live_demo", label: "Live Demo", icon: <IoPlayCircleOutline size={18} />, description: "Interact with a live sandbox" },
  ], []);

  const handleSuggestionClick = (suggestion) => {
    if (onInputChange) {
      onInputChange({ target: { value: suggestion } });
    }
    // Optionally focus the input or auto-submit if desired.
    // For now, just setting the text is a good UX.
  };

  const handleDownload = useCallback((content) => {
    if (!content) return;

    let formattedContent = content

      /* ---------- HEADINGS ---------- */
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')

      /* ---------- CODE BLOCKS ---------- */
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

      /* ---------- INLINE CODE ---------- */
      .replace(/`([^`]+)`/g, '<code>$1</code>')

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

    // Add Sources
    // formattedContent = formattedContent.replace(/\[Source:\s*(.*?)\]/g, (match, ids) => {
    //   const idList = ids.split(',').map(id => id.trim());
    //   return `
    //     <span class="inline-flex items-center gap-1 ml-1 align-baseline">
    //       ${idList.map(id => `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-[10px] text-zinc-500 font-bold border border-zinc-200" title="Source: ${id}">?</span>`).join('')}
    //     </span>
    //   `;
    // }); 

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
        font-size: 24px;
        font-weight: 700;
        margin: 24px 0 16px;
        color: #18181b;
      }

      h2 {
        font-size: 20px;
        font-weight: 600;
        margin: 20px 0 12px;
        border-bottom: 1px solid #e4e4e7;
        padding-bottom: 6px;
        color: #18181b;
      }

      h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 16px 0 10px;
        color: #27272a;
      }

      p {
        margin-bottom: 16px;
        text-align: justify;
      }

      hr {
        border: none;
        border-top: 1px solid #e4e4e7;
        margin: 24px 0;
      }

      ul {
        margin: 8px 0 16px 20px;
        padding-left: 16px;
      }

      li {
        margin-bottom: 6px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 14px;
      }

      th, td {
        border: 1px solid #d4d4d8;
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f4f4f5;
        font-weight: 600;
        color: #18181b;
      }

      b {
        font-weight: 600;
        color: #18181b;
      }
      
      pre {
        background-color: #18181b;
        color: #f4f4f5;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        font-family: Consolas, 'Courier New', monospace;
        font-size: 13px;
        margin: 20px 0;
        white-space: pre-wrap;
      }

      code {
        font-family: Consolas, 'Courier New', monospace;
        background-color: #f4f4f5;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 13px;
        color: #18181b;
      }

      pre code {
        background-color: transparent;
        padding: 0;
        color: #f4f4f5 !important;
        border-radius: 0;
      }

      /* FOOTER STYLES */
      p.MsoFooter, li.MsoFooter, div.MsoFooter {
        margin: 0;
        margin-bottom: 0.0001pt;
        mso-pagination: widow-orphan;
        tab-stops: center 3.0in right 6.0in;
        font-size: 12.0pt;
      }

      @page WordSection1 {
        size: 8.5in 11in;
        margin: 1.0in 1.0in 1.0in 1.0in;
        mso-header-margin: 0.5in;
        mso-footer-margin: 0.5in;
        mso-title-page: yes;
        mso-header: url("https://dummyimage.com/1x1/000000/000000.png") h1; /* Dummy header to force footer */
        mso-footer: url("https://dummyimage.com/1x1/000000/000000.png") f1;
        mso-first-header: url("https://dummyimage.com/1x1/000000/000000.png") fh1;
        mso-first-footer: url("https://dummyimage.com/1x1/000000/000000.png") ff1;
        mso-paper-source: 0;
      }

      div.WordSection1 {
        page: WordSection1;
      }

      table#footerTable {
        width: 100%;
        border: none;
        border-top: 1px solid #e5e7eb;
      }

      div.footer-content {
        font-family: 'Segoe UI', sans-serif;
        font-size: 14pt;
        font-weight: 600;
        color: black;
      }

      /* ADDITIONAL REFINEMENTS */
      .prose-a {
        color: #f23c39;
        text-decoration: underline;
      }
      
      table th {
        background-color: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
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
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
      </head>
      <body>
        <div class="WordSection1">
          ${formattedContent}
          <br clear="all" style="page-break-before:always" />
          
          <!-- FOOTER DEFINITION -->
          <div style="mso-element:footer" id="f1">
            <p class="MsoFooter">
              <table id="footerTable" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-top: 10px; text-align: left; vertical-align: middle;">
                     <p style="margin: 0; font-family: 'Segoe UI', sans-serif; font-size: 16pt; font-weight: 600; color: black;">
                       <span>TAS</span>
                       <span style="color: #f23c39; font-size: 20pt; vertical-align: middle; line-height: 1;">&#8226;</span>
                       <span style="color: #374151;">connect</span>
                     </p>
                  </td>
                </tr>
              </table>
            </p>
          </div>
          
          <div style="mso-element:header" id="h1">
             <!-- HEADER CONTENT (Empty) -->
          </div>
        </div>
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
    setShowLiveScreen(false);
  }, [hideLiveScreen])



  useEffect(() => {
    if (currentAssistantId) {
      const matched = slashOptions.find(opt => opt.id === currentAssistantId);
      if (matched) {
        setActiveModule(matched);
      }
    }
  }, [currentAssistantId]);

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
  const [scrollBottom, setScrollBottom] = useState('');
  const [scrollTopFlag, setScrollTopFlag] = useState('');
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  // Auto-scroll only if user was already at the bottom
  useEffect(() => {
    if (chatBodyRef.current && isAtBottomRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'auto' // Changed from 'smooth' to 'auto' to prevent interference with manual scrolling
      });
    }
  }, [newStreamingList]);

  // Reset scroll state when thread changes
  useEffect(() => {
    setShowLiveScreen(false);
    setLiveImageSrc(null);
    liveScreenConnectedRef.current = false;
    isAtBottomRef.current = true;
    setShowScrollBottomButton(false);
    setShowScrollTopButton(false);
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [threadId, isStreamNewChat]);

  // Force scroll when scrollBottom state changes (button click)
  useEffect(() => {
    if (chatBodyRef.current && scrollBottom) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
      isAtBottomRef.current = true;
      setShowScrollBottomButton(false);
    }
  }, [scrollBottom]);

  // Force scroll top when scrollTopFlag changes (button click)
  useEffect(() => {
    if (chatBodyRef.current && scrollTopFlag) {
      chatBodyRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      setShowScrollTopButton(false);
    }
  }, [scrollTopFlag]);

  const handleScroll = () => {
    if (chatBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isTop = scrollTop < 200;
      isAtBottomRef.current = isBottom;
      setShowScrollBottomButton(!isBottom);
      setShowScrollTopButton(!isTop);
    }
  };

  /* ---------- LIVE DEMO EFFECTS ---------- */
  // 1. Detect assign_task node
  useEffect(() => {
    if (activeModule?.id === 'live_demo' && !liveScreenConnectedRef.current) {
      setLiveImageSrc(null); // Clear previous image
      setShowLiveScreen(true);
      liveScreenConnectedRef.current = true;
    }
  }, [assignTask, activeModule]);

  // 2. Handle SSE Connection
  useEffect(() => {
    const abortController = new AbortController();

    if (showLiveScreen && threadId && isLoading) {
      console.log(`Connecting to live screen: /live/${threadId}/live_screen`);

      streamLiveScreen({
        threadId,
        signal: abortController.signal,
        onFrame: (data) => {
          if (data.frame) {
            setLiveImageSrc(`data:image/jpeg;base64,${data.frame}`);
            setIsLiveConnected(true);
          }
        },
        onError: (err) => {
          console.error("Live screen SSE error:", err);
          setIsLiveConnected(false);
        }
      });
      return () => {
        console.log("Closing live screen connection due to deps change or unmount");
        console.log("Pending cleanup deps:", { showLiveScreen, threadId });
        abortController.abort();
        setIsLiveConnected(false);
      }
    }
  }, [showLiveScreen, threadId, isLoading]);

  const handleSelectModule = (module) => {
    setActiveModule(module);
    onAssistantSuggestionSelect?.(module);
    onInputChange("");
  };

  // Reset live demo when assignTask becomes false OR isLoading is false
  useEffect(() => {
    if (!isLoading) {
      setIsLiveConnected(false);
      // setShowLiveScreen(false);
      // setLiveImageSrc(null);
    }
  }, [isLoading]);



  /* ---------- MARKDOWN COMPONENTS ---------- */
  const renderWithSources = (text) => {
    if (typeof text !== 'string') return text;

    const parts = text.split(/(\[Source:\s*.*?\])/g);
    return parts.map((part, index) => {
      const match = part.match(/^\[Source:\s*(.*?)\]$/);
      if (match) {
        const ids = match[1].split(',').map(id => id.trim());
        return (
          <span key={index} className="inline-flex gap-1 items-center align-baseline">
            {ids.map(id => <SourceTooltip key={id} id={id} />)}
          </span>
        );
      }
      return part;
    });
  };

  const markdownComponents = useMemo(() => ({
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
    p: ({ node, children, ...props }) => (
      <div className="mb-3 last:mb-0 leading-relaxed text-zinc-700 break-words" {...props}>
        {React.Children.map(children, child =>
          typeof child === 'string' ? renderWithSources(child) : child
        )}
      </div>
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-zinc-900" {...props} />
    ),

    /* ---------- CODE ---------- */
    pre: ({ node, ...props }) => (
      <CodeBlock {...props} />
    ),
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm font-mono text-zinc-900 break-all" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={`${className} bg-transparent p-0 text-inherit font-mono`} {...props}>
          {children}
        </code>
      );
    },

    /* ---------- LISTS ---------- */
    ul: ({ node, ...props }) => (
      <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />
    ),
    li: ({ node, children, ...props }) => (
      <li className="pl-1 text-zinc-700" {...props}>
        {React.Children.map(children, child =>
          typeof child === 'string' ? renderWithSources(child) : child
        )}
      </li>
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
  }), []);




  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50">

      {showScrollTopButton && (
        <button
          onClick={() => setScrollTopFlag(`scrollTop${Date.now()}`)}
          className="absolute top-8 right-8 z-50 flex items-center justify-center
                   bg-white text-[var(--brand)] rounded-full p-2 shadow-lg border
                   border-zinc-200 hover:bg-zinc-50 transition-all hover:scale-110"
          aria-label="Scroll to top"
        >
          <IoArrowUpCircle size={30} />
        </button>
      )}

      {showScrollBottomButton && (
        <button
          onClick={() => setScrollBottom(`scrollBottom${Date.now()}`)}
          className="absolute bottom-28 right-8 z-50 flex items-center justify-center
                   bg-white text-[var(--brand)] rounded-full p-2 shadow-lg border
                   border-zinc-200 hover:bg-zinc-50 transition-all hover:scale-110"
          aria-label="Scroll to bottom"
        >
          <IoArrowDownCircle size={30} />
        </button>
      )}

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white">

        <div
          ref={chatBodyRef}
          onScroll={handleScroll}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-6 scroll-smooth"
        >
          {isStreamNewChat && newStreamingList.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full px-4 md:px-12 animate-in fade-in zoom-in-95 duration-700">
              {/* Background Blobs */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-[var(--brand)]/30 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

              <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4">
                {/* Hero Tile (Span 4) - Unified Welcome Message */}
                <div className="col-span-1 md:col-span-4 row-span-2 relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 backdrop-blur-md shadow-xl p-8 flex flex-col justify-between items-center text-center group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="flex flex-col items-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#f23c39] text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                      <IoSparklesOutline size={24} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-800 leading-tight">
                      Hi I'm <span className="bg-gradient-to-r from-[#ff6b35] via-[#f23c39] to-[#e11d48] bg-clip-text text-transparent font-bold">TASC</span> <span className="bg-gradient-to-r from-[#f23c39] via-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent font-bold">Iris</span>
                    </h2>
                    <div className="mt-8 space-y-4 text-zinc-600 leading-relaxed text-sm max-w-2xl mx-auto">
                      <p>
                        I’m here to support you by bringing structure, clarity, and perspective to whatever you’re working through—whether it’s technical detail, process design, or a business decision that needs sharper framing.
                      </p>
                      <p>
                        You can treat this space as a working session: ask questions, pressure-test ideas, or walk through something step by step. I’ll stay focused on what moves things forward.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Ready to assist</p>
                  </div>
                </div>

              </div>

              {/* <div className="mt-12 opacity-60">
                <p className="text-sm text-zinc-500 animate-pulse">What would you like to work on today?</p>
              </div> */}
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

            const isTrainingModule = msg.langgraph_node == 'aggregator'

            const isAgent = currentAssistantId === "agent";
            const isLiveDemo = activeModule?.id === "live_demo";

            /* ================= COPY BUTTON ================= */
            const CopyIconButton = ({ className }) => (
              <button
                onClick={() => handleCopy(msg.content, msgId)}
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
                <div key={msgId} className="flex w-full mt-2 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="flex w-full flex-col items-end gap-1.5">
                    <div className="group relative ml-auto w-fit max-w-[85%] rounded-2xl border border-[var(--brand-light)] bg-[var(--brand-lighter)] px-4 py-2.5 text-[13.5px] text-zinc-800 shadow-sm">
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(msg.content, msgId)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-[var(--brand)] transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50"
                    >
                      {copiedMessageKey === msgId ? (
                        <>
                          <IoCheckmark size={14} className="text-green-500" />
                          <span className="text-green-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <IoCopyOutline size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            /* ================= ASSISTANT ================= */

            // Check if it's a tool-related message
            const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
            const isToolResult = msg.role === 'tool' || msg.type === 'tool';

            // Hide live demo assistant messages unless they are from history OR assign_task is not yet triggered
            // If assignTask is false, we want to SHOW the message in chat.
            // So we HIDE if: isLiveDemo AND !isUser AND !isHistory AND assignTask is TRUE.
            if (isToolResult) {
              return null;
            }

            // If it's an assistant message with tool calls but NO content, 
            // render a simple text line indicating tool usage.
            if (hasToolCalls && !msg.content) {
              return (
                <div key={msgId} className="flex flex-col gap-1 w-full max-w-5xl mx-auto px-4">
                  {msg.tool_calls.map((tc, index) => (
                    <span key={index} className="text-xs text-zinc-400 italic animate-pulse">
                      Using tool: {tc.function ? tc.function.name : tc.name}...
                    </span>
                  ))}
                </div>
              );
            }

            // For standard messages (or mixed content/tool calls where content exists)
            return (
              <div key={msgId} className="flex w-full flex-col gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                <div
                  className={`flex flex-col gap-2 items-start ${isTrainingModule
                    ? "w-full max-w-5xl"
                    : "w-full"
                    }`}
                >
                  {/* ===== HEADER ACTIONS ===== */}
                  {(isTrainingModule || isAgent || isLiveDemo) && (
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
                  {/* Only render the bubble if there is actual content */}
                  {msg.content && (
                    <>
                      <div
                        className={`group relative ${isTrainingModule
                          ? "h-[500px] w-full"
                          : "mr-auto w-fit max-w-[85%]"
                          } rounded-2xl border border-zinc-200 text-[13.5px] text-zinc-700 ${isTrainingModule
                          ? "overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent border-2 bg-zinc-50/30 p-8 shadow-inner"
                          : "bg-white px-5 py-3.5 shadow-sm"
                          } ${msg.hasToolCall ? "animate-pulse" : ""}`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.content || ""}
                        </ReactMarkdown>
                      </div>

                      {/* Copy button below message for non-training modules */}
                      {!isTrainingModule && (
                        <button
                          onClick={() => handleCopy(msg.content, msgId)}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-[var(--brand)] transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 self-start mt-1"
                        >
                          {copiedMessageKey === msgId ? (
                            <>
                              <IoCheckmark size={14} className="text-green-500" />
                              <span className="text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <IoCopyOutline size={14} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* If there are tool calls AND content, show indicator below text */}
                  {hasToolCalls && msg.content && (
                    <div className="mt-2">
                      <span className="text-xs text-zinc-400 italic">
                        Using tool: {msg.tool_calls.map(tc => tc.function ? tc.function.name : tc.name).join(", ")}...
                      </span>
                    </div>
                  )}

                </div>
              </div>
            );
          })}



          {/* LIVE SCREEN (MJPEG) */}
          {showLiveScreen && liveImageSrc && (
            <div className="w-full h-[400px] border border-zinc-200 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center bg-black relative">

              {/* Live Demo Header */}
              {isLiveConnected && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full z-10 transition-all duration-300">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-white text-xs font-medium tracking-wide">Live Demo</span>
                </div>
              )}

              <img
                src={liveImageSrc}
                alt="Live Screen"
                className="w-full h-full object-contain"
              // Initial placeholder or loader could go here
              />
            </div>
          )}

          {/* SANDBOX IFRAME (Fallback/Pre-Live) */}
          {/* {(!showLiveScreen || !liveImageSrc) && sandboxUrlLink && activeModule?.id == 'live_demo' && !isStreamNewChat && isLoading && (
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
          )} */}



          {isLoading && newStreamingList.length > 0 && !newStreamingList.some(msg => msg.role === 'assistant') && (
            <div className="flex justify-start">
              <div className="group flex items-center justify-between gap-4 w-full max-w-sm rounded-xl border border-zinc-200/50 bg-white/90 backdrop-blur-sm px-6 py-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all hover:bg-white">
                <div className="flex w-full items-center justify-between relative">
                  {/* Multi-step progress indicator */}
                  {['starting', 'compiling', 'completed'].includes(customStates) && (
                    <>
                      {/* Progress Line Background */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-100 -z-10 transform -translate-y-1/2"></div>

                      {/* Steps */}
                      {[
                        { id: 'starting', label: 'Initialize', icon: IoPlayCircleOutline },
                        { id: 'compiling', label: 'Compile', icon: IoLayersOutline },
                        { id: 'completed', label: 'Complete', icon: IoCheckmark }
                      ].map((step, index) => {
                        const currentStepIndex = ['starting', 'compiling', 'completed'].indexOf(customStates);
                        const isCompleted = (currentStepIndex > index && currentStepIndex !== -1) || customStates === 'completed';
                        const isActive = customStates === step.id;

                        return (
                          <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2 z-10 transition-all duration-300">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${isActive
                                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] scale-110 shadow-md'
                                : isCompleted
                                  ? 'border-green-500 bg-green-50 text-green-500'
                                  : 'border-zinc-200 bg-white text-zinc-300'
                                }`}
                            >
                              {isCompleted ? (
                                <IoCheckmark size={16} />
                              ) : (
                                <step.icon size={16} className={`${isActive && step.id !== 'completed' ? 'animate-pulse' : ''}`} />
                              )}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-[var(--brand)] font-bold' : isCompleted ? 'text-green-600' : 'text-zinc-400'
                              }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Fallback for Generic "Processing" State */}
                  {!['starting', 'compiling', 'completed'].includes(customStates) && (
                    <div className="flex w-full items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] animate-pulse">
                        <IoSparklesOutline size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</span>
                        <span className="text-xs font-semibold text-zinc-700">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
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

        <div className="w-full border-t border-zinc-100 bg-white px-3 py-4">
          <div className="relative flex w-full flex-col gap-2 rounded-3xl bg-zinc-50/80 p-3 shadow-sm ring-1 ring-zinc-100">
            <div className="flex w-full min-w-0 items-end gap-3">
              {activeModule && activeModule?.id !== "agent" && (
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
                wrap="off"
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
                className="w-full flex-1 min-w-0 resize-none text-sm py-2.5 px-3 min-h-[44px] max-h-[200px] overflow-y-auto whitespace-pre-wrap
             border-0 outline-none focus:outline-none focus:ring-0
             bg-transparent"

              />


              <button
                onClick={isLoading ? onStop : handleSubmit}
                className="shrink-0 self-end mb-1 p-2.5 bg-[var(--brand)] text-white rounded-xl shadow-lg"
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
