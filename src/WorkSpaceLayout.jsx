import React, { useEffect, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar.jsx";
import ChatSection from "./components/ChatSection.jsx";
import RightSidebar from "./components/RightSidebar.jsx";
import TopHeader from "./components/TopHeader.jsx";
import { resolveAssistantId, fetchThreadById, getStreamMessages, createThread, threadHistory, stopStream, cancelRun, cleanupContainer, getArtifact } from "./services/threadService.js";
import ComingSoonModal from "./components/ComingSoonModal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const DEFAULT_ASSISTANT_ID = resolveAssistantId();
const ASSISTANT_SUGGESTIONS = [
  {
    id: DEFAULT_ASSISTANT_ID,
    label: "Training",
    description: "Run through guided onboarding and training flows.",
  },
  {
    id: resolveAssistantId("live_demo"),
    label: "Live Demo",
    description: "Launch the interactive demo workflow with sandbox access.",
  },
];
const UNIFIED_STREAM_MODES = ["messages", "modules", "metadata", "custom", "updates", "messages-tuple", "values"];
const MODULE_STREAM_RULES = {
  agent: {
    acceptEvents: ["result", "aggregator"],
    hideIntermediateAssistants: true,
  },

  training_module_graph: {
    acceptEvents: ["aggregator", "router"],
    hideIntermediateAssistants: true,
  },

  live_demo: {
    acceptEvents: ["router"],
    hideIntermediateAssistants: false,
  },
};

export default function workSpaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatBodyRef = React.useRef(null);
  const [assistantId, setAssistantId] = React.useState(DEFAULT_ASSISTANT_ID);
  const [showAssistantChooser, setShowAssistantChooser] = React.useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = React.useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [searchedText, setSearchedText] = useState('');
  const [newStreamingList, setNewStreamingList] = useState([]);
  const [searchedMessages, setSearchedMessages] = useState('');
  const hasResultRef = useRef(false);
  const streamedListRef = useRef([]);
  const streamedDemoListRef = useRef([]);
  const [chatIsLoading, setChatIsLoading] = useState(false);
  const [isStreamNewChat, setIsStreamNewChat] = useState(true);
  const [loadHistoryToggle, setLoadHistoryToggle] = useState("load");
  const initialMessage = location.state?.initialMessage;
  const state_assistant_id = location.state?.assistant_id || location.state?.assistantId || 'agent';
  const loadHistory = location.state?.loadHistory || location.state?.loadHistory || '';
  const [streamSandboxUrl, setStreamSandboxUrl] = useState('');
  const [selectedThreadChatId, setThreadChatId] = useState('');
  const [customStates, setCustomStates] = useState('');
  const [runId, setRunId] = useState('');
  const [liveDemoThinking, setLiveDemoThinking] = useState([]);
  const [reloadThread, setReloadThread] = useState('')
  const [toolCalls, setToolCalls] = useState([])

  const [containerId, setContainerId] = useState('');
  const [showDemoSteps, setShowDemoSteps] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { chatId: threadChatId } = useParams();
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[1] === "chat") {
      setThreadChatId(pathParts[2]);
    } else if (pathParts.length === 2 && pathParts[1] === "chat") {
      openNewChat();
    }
  }, [location.pathname]);

  const assistantSuggestions = React.useMemo(() => ASSISTANT_SUGGESTIONS, []);

  React.useEffect(() => {
    console.log(threadChatId);
    if (threadChatId) {
      setLoadHistoryToggle(`load_${Date.now()}`);
      setThreadChatId(threadChatId);
      setShowAssistantChooser(false);
    }
  }, [threadChatId]);


  useEffect(() => {
    setIsRightCollapsed(true)
  }, [!threadChatId])

  const shouldShowAssistantSuggestions = showAssistantChooser && !threadChatId;

  const handleInputChange = React.useCallback(
    (value) => {
      setInput(value);

      // If there's an active thread, don't show assistant chooser
      if (threadChatId) {
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
    [threadChatId],
  );


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

  const toggleRightCollapse = React.useCallback(
    () => setIsRightCollapsed((prev) => !prev),
    [],
  );

  // useEffect(() => {
  //   setThreadChatId(threadChatId);
  // }, [threadChatId])

  // useEffect(() => {
  //   setLoadHistoryToggle(`load_${Date.now()}`);
  // }, [loadHistory, threadChatId])

  // useEffect(() => {
  //   if (state_assistant_id) {
  //     setAssistantId(state_assistant_id);
  //   }
  // }, [state_assistant_id]);

  useEffect(() => {
    if (!threadChatId || searchedText.length === 0) return;
    setRunId('');
    setInput('');
    setLoadHistoryToggle("");
    streamedDemoListRef.current = [];
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
          stream_mode: UNIFIED_STREAM_MODES,
          stream_subgraphs: true,
          stream_resumable: true,
          assistant_id: assistantId ? assistantId : 'agent',
        },
        options: { on_disconnect: "cancel" },

        onChunk: (event, data) => {
          if (event == 'metadata') {
            setRunId(data.run_id);
          }
          if (event == 'custom') {
            setCustomStates(data.status)
          }
          if (!["messages", "updates"].includes(event)) return;

          if (event === 'messages' || event.includes('messages')) {
            data.forEach((msg) => {
              const hasToolUse = (msg.tool_calls && msg.tool_calls.length > 0) ||
                (Array.isArray(msg.content) && msg.content.some(c => c.type === 'tool_use'));

              if (hasToolUse) {
                if (msg.tool_calls) {
                  msg.tool_calls.forEach((tool) => {
                    if (tool.name === "AssignerOutput" && (tool.args?.all_done === true || tool.input?.all_done === true)) {
                      setStreamSandboxUrl("");
                    }
                  });
                }
                // NEW LOGIC: Reset content for this message if tool usage detected
                const idx = streamedListRef.current.findIndex(m => m.id === msg.id);
                if (idx !== -1) {
                  // instead of splicing, we just clear the content so the "previous text" is gone
                  // but the message remains to show the tool status
                  streamedListRef.current[idx].content = "";
                  streamedListRef.current[idx].tool_calls = msg.tool_calls;
                }
              }
            });

            hasResultRef.current = MODULE_STREAM_RULES[assistantId].acceptEvents?.length === 0 || MODULE_STREAM_RULES[assistantId].acceptEvents?.includes(data[1].langgraph_node) || assistantId == 'live_demo'
            if (!hasResultRef.current) return;
            if (assistantId == 'live_demo') {
              data
                .filter(msg => msg.type === "ai")
                .forEach(msg => {
                  const idx = streamedDemoListRef.current.findIndex(m => m.id === msg.id);
                  if (msg.content?.length) {
                    let filterText = msg.content.filter(res => res.type == 'text');
                    if (filterText?.length) {
                      if (idx !== -1) {
                        streamedDemoListRef.current[idx].content += filterText[0].text;
                      }
                      else {
                        streamedDemoListRef.current.push({
                          id: msg.id,
                          role: "assistant",
                          content: filterText[0].text,
                          langgraph_node: data[1].langgraph_node // ✅ stored here
                        })
                      }
                    }
                  }
                })
            }
            else {
              let aiMessages = data.filter(msg => msg.type === "AIMessageChunk");
              console.log(aiMessages);
              aiMessages.forEach(msg => {
                // If this chunk has tool calls, ensure we update our ref
                // If this chunk has tool calls, ensure we update our ref
                const hasToolUse = (msg.tool_calls && msg.tool_calls.length > 0) ||
                  (Array.isArray(msg.content) && msg.content.some(c => c.type === 'tool_use'));

                if (hasToolUse) {
                  const idx = streamedListRef.current.findIndex(m => m.id === msg.id);
                  if (idx !== -1 && msg.tool_calls) {
                    streamedListRef.current[idx].tool_calls = msg.tool_calls;
                  }
                }

                const idx = streamedListRef.current.findIndex(m => m.id === msg.id);
                if (msg.content?.length && msg.content[0].type == 'text') {
                  if (idx !== -1) {
                    streamedListRef.current[idx].content += msg.content[0].text;
                  }
                  else {
                    streamedListRef.current.push({
                      id: msg.id,
                      role: "assistant", // "ai" -> "assistant"
                      content: msg.content[0].text,
                      langgraph_node: data[1].langgraph_node // ✅ stored here
                    });
                  }
                }
              });
            }

            console.log(streamedDemoListRef);
            setNewStreamingList([...streamedListRef.current]);
            setLiveDemoThinking([...streamedDemoListRef.current])
            if (streamedDemoListRef.current?.length) {
              setShowDemoSteps(true);
              setIsRightCollapsed(false);
            }

          }
          else {
            if (event === 'updates' || event.includes('updates')) {
              let obj = Object.keys(data);
              data[obj[0]]?.messages?.forEach((msg) => {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                  if (msg.content) {
                    setToolMessages(prev => [
                      ...prev,
                      Array.isArray(msg.content) ? msg.content.map((c) => c.text || "").join("") : msg.content
                    ]);
                  }
                }
              });
              console.log(toolMessages);
            }
            if (data?.invoke_init?.sandbox_url) {
              setContainerId(data.invoke_init.container_id)
              setStreamSandboxUrl(data.invoke_init.sandbox_url);
            }

            // if(isStreamNewChat){
            //   streamedListRef.current = [];

          }
        },

        onDone: () => {
          setSearchedText('');
          setSearchedMessages([]);
          setChatIsLoading(false);
          setStreamSandboxUrl('');
          hasResultRef.current = false;
          setContainerId('')
          if (initialMessage) {
            navigate(`/chat/${threadChatId}`, {
              replace: true, state: {
                initialMessage: null,
                assistant_id: assistantId
              }
            });
          }
          else {
            // setLoadHistoryToggle("load");
          }
        },

        onError: console.error,
      });
    }, 500)
  }, [threadChatId, searchedText]);


  // useEffect(() => {
  //   if (threadChatId) {
  //     setIsStreamNewChat(false);
  //     setSearchedText('');
  //     // threadHistory(threadChatId);
  //   }
  // }, [threadChatId])


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
    setIsRightCollapsed(true);
    setShowDemoSteps(false);
    setLiveDemoThinking([]);
    if (loadHistoryToggle.includes("load")) {
      threadHistory(threadChatId).then(async (response) => {
        if (cancelled) return;
        setInput('');
        setSearchedText('');
        const historyMessages = Array.isArray(response) ? response : [];

        const LiveDemoAssistantMessages = [];

        const msg_values = historyMessages[0]?.values?.messages;
        setStreamSandboxUrl(historyMessages[0]?.values?.sandbox_url)

        const processedMessages = await Promise.all(
          (msg_values || []).map(async (msg) => {
            if (!msg) return null;
            if (msg.type !== "human" && msg.type !== "ai") return null;
            if ((typeof msg.content !== "string") && !Array.isArray(msg.content)) return null;

            if (['training_module_graph', 'agent'].includes(assistantId)) {
              if (msg.content?.length > 1 && msg.content[1].type == 'tool_use') {
                return;
              }
              let content = typeof msg.content == 'string' ? msg.content : (msg.content?.length > 0 ? msg.content[0].text : '');
              let langgraph_node = msg.langgraph_node || '';
              if (msg.additional_kwargs?.artifact_id) {
                try {
                  const artifactContent = await getArtifact(threadChatId, msg.additional_kwargs.artifact_id);
                  if (artifactContent) {
                    let artifactText = '';
                    if (typeof artifactContent === 'object') {
                      artifactText = artifactContent.content || artifactContent.text || JSON.stringify(artifactContent, null, 2);
                    } else {
                      artifactText = String(artifactContent);
                    }

                    const arrayObj = [];
                    if (artifactText) {
                      arrayObj.push({
                        id: `${msg.id}_artifact`, // Ensure unique ID
                        role: msg.type === "human" ? "user" : "assistant",
                        content: artifactText,
                        langgraph_node: 'aggregator'
                      });
                    }
                    if (content) {
                      arrayObj.push({
                        id: msg.id,
                        role: msg.type === "human" ? "user" : "assistant",
                        content: content,
                        langgraph_node: 'ai'
                      });
                    }
                    if (arrayObj.length > 0) return arrayObj;
                  }
                } catch (e) {
                  console.error("Failed to load artifact", e);
                }
              }

              if (content) {
                return {
                  id: msg.id,
                  role: msg.type === "human" ? "user" : "assistant",
                  content,
                  langgraph_node
                };
              }
            } else {
              if (msg.type == 'human') {
                return {
                  id: msg.id,
                  type: 'demo',
                  role: msg.type === "human" ? "user" : "assistant",
                  content: msg.content,
                  video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                };
              } else {
                LiveDemoAssistantMessages.push({
                  id: msg.id,
                  role: msg.type === "human" ? "user" : "assistant",
                  content: msg.content,
                });
                return null;
              }
            }
            return null;
          })
        );

        const filteredMessages = processedMessages.flat().filter(Boolean);
        // Handle Live Demo Logic Separation
        // The original code pushed to filteredMessages OR LiveDemoAssistantMessages. 
        // My map returns objects for filteredMessages (agent) or demo-user messages. 
        // LiveDemo assistant messages are pushed to LiveDemoAssistantMessages as side effect inside map.

        console.log(filteredMessages);

        streamedListRef.current = filteredMessages;
        setLiveDemoThinking(LiveDemoAssistantMessages);
        setNewStreamingList(streamedListRef.current);
        if (LiveDemoAssistantMessages?.length) {
          setShowDemoSteps(true);
          setIsRightCollapsed(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [loadHistoryToggle]);


  const openNewChat = () => {
    streamedListRef.current = [];
    setIsStreamNewChat(true);
    setInput('');
    setNewStreamingList([]);
    setChatIsLoading(false);
    setLoadHistoryToggle("");
    setSearchedText('');
    setAssistantId('agent');
    setReloadThread(true);
    setStreamSandboxUrl('');
    setThreadChatId('');
    setLiveDemoThinking([]);
    setShowDemoSteps(false);
    setIsRightCollapsed(true);
  }

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
  }, [searchedText])

  const handleSubmit = () => {
    if (!input) return;
    setSearchedText(input);
  }

  const handleStreamStop = () => {
    setChatIsLoading(false);
    const subscription = cancelRun(threadChatId, runId).subscribe({
      next: (res) => {
        console.log("Stream stopped:", res);
        subscription.unsubscribe();
      },
      error: (err) => {
        console.error("Failed to stop stream:", err);
      }
    });
    const subscriptionCleanUp = cleanupContainer(containerId).subscribe({
      next: (res) => {
        console.log("Stream stopped:", res);
        subscriptionCleanUp.unsubscribe();
      },
      error: (err) => {
        console.error("Failed to stop stream:", err);
      }
    });
  }

  const handleAssistantSuggestionSelect = (response) => {
    console.log(response);
    if (response.id === resolveAssistantId("live_demo") || response.label === "Live Demo") {
      setShowComingSoon(true);
      return;
    }
    setAssistantId(response.id);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-[var(--brand-lighter)] via-zinc-50 to-white px-6 py-8 text-zinc-700">
      <div className="flex h-full w-full min-h-0 max-w-8xl flex-col gap-4">

        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden items-stretch">
          <div className="flex h-full flex-col">
            <TopHeader theme='light' isLeftCollapsed={isLeftCollapsed} />
            <LeftSidebar
              theme='light'
              isCollapsed={isLeftCollapsed}
              // isLoading={chatIsLoading}
              onStartNewChat={openNewChat}
              onToggleCollapse={toggleLeftCollapse}
              refreshThread={reloadThread}
              selectedChatId={threadChatId}
            />
          </div>

          <ChatSection
            theme='light'
            newStreamingList={newStreamingList}
            chatBodyRef={chatBodyRef}
            input={input}
            toolCalls={toolCalls}
            isLoading={chatIsLoading}
            isStreamNewChat={isStreamNewChat}
            sandboxUrl={streamSandboxUrl}
            customStates={customStates}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onInputChange={handleInputChange}
            onStop={handleStreamStop}
            handleSubmit={handleSubmit}
            assistantSuggestions={assistantSuggestions}
            currentAssistantId={assistantId}
            activeModule={assistantId}
            onAssistantSuggestionSelect={handleAssistantSuggestionSelect}
            shouldShowAssistantSuggestions={shouldShowAssistantSuggestions}
            threadId={threadChatId}
            onShowComingSoon={() => setShowComingSoon(true)}
          />

          <RightSidebar
            isCollapsed={isRightCollapsed}
            theme='light'
            isThinking={chatIsLoading}
            liveDemoMessages={liveDemoThinking}
            onToggleCollapse={toggleRightCollapse}
            showDemoSteps={showDemoSteps}
          // toolOutputs={toolOutputs}
          // sources={sources}
          />
        </div>
      </div>
      <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} />
    </div>
  );

}
