import React, { useEffect, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar.jsx";
import ChatSection from "./components/ChatSection.jsx";
import RightSidebar from "./components/RightSidebar.jsx";
import TopHeader from "./components/TopHeader.jsx";
import { resolveAssistantId, fetchThreadById, getStreamMessages, createThread, threadHistory, stopStream, cancelRun, cleanupContainer, getArtifact } from "./services/threadService.js";

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
    acceptEvents: ["planner", "assign_task"],
    hideIntermediateAssistants: false,
  },
};

export default function workSpaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatBodyRef = React.useRef(null);
  const [doneBrowser, setDoneBrowser] = useState(false);
  const [assignTask, setAssignTask] = useState(false);
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
  const streamedPlannerTodosRef = useRef([]); // New ref for Todos
  const [chatIsLoading, setChatIsLoading] = useState(false);
  const [isStreamNewChat, setIsStreamNewChat] = useState(true);
  const [loadHistoryToggle, setLoadHistoryToggle] = useState("load");
  const initialMessage = location.state?.initialMessage;
  const state_assistant_id = location.state?.assistant_id || location.state?.assistantId || 'agent';
  const loadHistory = location.state?.loadHistory || location.state?.loadHistory || '';
  const [selectedThreadChatId, setThreadChatId] = useState('');
  const [customStates, setCustomStates] = useState('');
  const [runId, setRunId] = useState('');
  const [liveDemoThinking, setLiveDemoThinking] = useState([]);
  const [liveDemoTodos, setLiveDemoTodos] = useState([]); // New state for Todos
  const [reloadThread, setReloadThread] = useState('')
  const [toolCalls, setToolCalls] = useState([])
  const [usedTools, setUsedTools] = useState([]);
  const usedToolsRef = useRef([]);
  const isToolCallRef = useRef(false);

  const [containerId, setContainerId] = useState('');
  const [showDemoSteps, setShowDemoSteps] = useState('');


  useEffect(() => {
    if (customStates === 'completed') {
      const timer = setTimeout(() => {
        setCustomStates('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [customStates]);

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

  const startNewLineRef = useRef(true);
  useEffect(() => {
    if (!threadChatId || searchedText.length === 0) return;
    setRunId('');
    setInput('');
    setLoadHistoryToggle("");
    streamedDemoListRef.current = [];
    streamedPlannerTodosRef.current = []; // Reset Todos ref
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
            hasResultRef.current = MODULE_STREAM_RULES[assistantId].acceptEvents?.length === 0 || MODULE_STREAM_RULES[assistantId].acceptEvents?.includes(data[1].langgraph_node);
            if (!hasResultRef.current) return;

            let aiMessages = data.filter(msg => msg.type === "AIMessageChunk");
            aiMessages.forEach(msg => {
              // If this chunk has tool calls, ensure we update our ref
              const hasToolUse = Array.isArray(msg.content) && msg.content.some(c => c.type === 'tool_use');

              if (hasToolUse) {
                isToolCallRef.current = true;
                let index = streamedListRef.current.length - 1;
                if (streamedListRef.current[index].role == 'assistant') {
                  streamedListRef.current[index].hasToolCall = true;
                }
              }

              const idx = streamedListRef.current.findIndex(m => m.id === msg.id);
              if (typeof msg.content == 'object' && msg.content?.length && msg.content[0].type == 'text') {
                if (assistantId == 'agent') {
                  if (isToolCallRef.current) {
                    // Find the last assistant message to remove (the one currently streaming)
                    let inner_idx = -1;
                    for (let i = streamedListRef.current.length - 1; i >= 0; i--) {
                      if (streamedListRef.current[i].role === "assistant") {
                        inner_idx = i;
                        break;
                      }
                    }

                    if (inner_idx != -1) {
                      streamedListRef.current.splice(inner_idx, 1);
                    }
                    setNewStreamingList([...streamedListRef.current]);
                    isToolCallRef.current = false;
                  }
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

                  setNewStreamingList([...streamedListRef.current]);
                }
                else {
                  if (isToolCallRef.current) {
                    if (msg.content?.length) {
                      startNewLineRef.current = true;
                      isToolCallRef.current = false;
                    }
                  }

                  else {
                    if (!streamedListRef.current?.length) {
                      streamedListRef.current.push({
                        id: msg.id,
                        role: "assistant", // "ai" -> "assistant"
                        content: msg.content[0].text,
                        langgraph_node: data[1].langgraph_node // ✅ stored here
                      });
                    }
                    else {
                      const lastMsg = streamedListRef.current[streamedListRef.current.length - 1];
                      if (startNewLineRef.current || (lastMsg && lastMsg.role !== 'assistant')) {
                        streamedListRef.current.push({
                          id: msg.id,
                          role: "assistant", // "ai" -> "assistant"
                          content: msg.content[0].text,
                          langgraph_node: data[1].langgraph_node // ✅ stored here
                        });
                        startNewLineRef.current = false; // Reset flag if we forced a new line due to role mismatch
                      } else {
                        streamedListRef.current[streamedListRef.current.length - 1].content += msg.content[0].text;
                      }
                    }
                    startNewLineRef.current = false;
                  }
                  console.log(streamedListRef.current);
                  setLiveDemoThinking([...streamedListRef.current])
                }
              }



              if (assistantId == 'live_demo' && !assignTask && data[1].langgraph_node == 'assign_task') {
                setAssignTask(true);
              }
            });



          }
          else {
            if (event === 'updates' || event.includes('updates')) {
              let obj = Object.keys(data);

              if (obj[0] === 'planner' && data['planner']?.todos) {
                data['planner'].todos.forEach((todo) => {
                  const content = todo.content || todo;
                  streamedPlannerTodosRef.current.push({
                    id: `planner-${Date.now()}-${Math.random()}`,
                    role: "assistant",
                    content: content
                  });
                });
                setLiveDemoTodos([...streamedPlannerTodosRef.current]); // Update Todos State
                setShowDemoSteps(true); // Maybe keep this to show sidebar?
                setIsRightCollapsed(false);
              }

              data[obj[0]]?.messages?.forEach((msg) => {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                  msg.tool_calls.forEach((tool) => {
                    const toolName = tool.function?.name || tool.name;
                    const toolId = tool.id || `tool-${Date.now()}-${Math.random()}`;
                    if (toolName) {
                      // Avoid duplicates if needed, or just push all
                      usedToolsRef.current.push({
                        id: toolId,
                        name: toolName,
                        args: tool.function?.arguments || tool.args,
                        timestamp: Date.now()
                      });
                    }
                  });
                  setUsedTools([...usedToolsRef.current]);
                  // Also ensure sidebar is open if tools are being used? 
                  // setIsRightCollapsed(false); 
                }
              });
            }

          }
        },

        onDone: () => {
          setSearchedText('');
          setSearchedMessages([]);
          setChatIsLoading(false);
          setAssignTask(false);
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

          if (assistantId == 'live_demo') {
            setDoneBrowser(true);
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

        // Fetch thread details to get assistant_id and set it
        fetchThreadById(threadChatId).then((thread) => {
          if (thread && !cancelled) {
            const threadAssistantId = thread.metadata?.assistant_id || thread.assistant_id || 'agent';
            console.log("Setting assistant ID to:", threadAssistantId);
            setAssistantId(thread.metadata?.graph_id);
          }
        }).catch(err => console.error("Failed to fetch thread details:", err));

        setInput('');
        setSearchedText('');
        const historyMessages = Array.isArray(response) ? response : [];

        const LiveDemoAssistantMessages = [];

        const msg_values = historyMessages[0]?.values?.messages;

        const processedMessages = await Promise.all(
          (msg_values || []).map(async (msg) => {
            if (!msg) return null;
            if (msg.type !== "human" && msg.type !== "assistant" && msg.type !== "ai") return null;
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
              let content = typeof msg.content == 'string' ? msg.content : (Array.isArray(msg.content) && msg.content.length > 0 && msg.content[0].type === 'text' ? msg.content[0].text : JSON.stringify(msg.content));

              if (msg.type == 'human') {
                return {
                  id: msg.id,
                  type: 'demo',
                  role: msg.type === "human" ? "user" : "assistant",
                  content: content,
                  video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                };
              } else {
                LiveDemoAssistantMessages.push({
                  id: msg.id,
                  role: msg.type === "human" ? "user" : "assistant",
                  content: content,
                });
                return null;
              }
            }
            return null;
          })
        );

        const filteredMessages = processedMessages.flat().filter(Boolean);
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


  const handleStreamStop = () => {
    console.trace("handleStreamStop called"); // Trace usage
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

  const openNewChat = () => {
    handleStreamStop();
    streamedListRef.current = [];
    setIsStreamNewChat(true);
    setInput('');
    setNewStreamingList([]);
    setChatIsLoading(false);
    setLoadHistoryToggle("");
    setSearchedText('');
    setAssistantId('agent');
    setReloadThread(true);
    setThreadChatId('');
    setLiveDemoThinking([]);
    setLiveDemoTodos([]); // Reset Todos
    setUsedTools([]);
    usedToolsRef.current = [];
    setShowDemoSteps(false);
    setIsRightCollapsed(true);
    setAssignTask(false);
    setDoneBrowser(false);
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



  const handleAssistantSuggestionSelect = (response) => {
    console.log(response);

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
            customStates={customStates}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onInputChange={handleInputChange}
            onStop={handleStreamStop}
            handleSubmit={handleSubmit}
            assistantSuggestions={assistantSuggestions}
            currentAssistantId={assistantId}
            assignTask={assignTask}
            doneBrowser={doneBrowser}
            // activeModule={assistantId}
            onAssistantSuggestionSelect={handleAssistantSuggestionSelect}
            shouldShowAssistantSuggestions={shouldShowAssistantSuggestions}
            threadId={threadChatId}

          />

          {assistantId === 'live_demo' && (
            <RightSidebar
              isCollapsed={isRightCollapsed}
              theme='light'
              isThinking={chatIsLoading}
              liveDemoMessages={liveDemoThinking}
              liveDemoTodos={liveDemoTodos} // Pass Todos
              usedTools={usedTools}
              onToggleCollapse={toggleRightCollapse}
              showDemoSteps={showDemoSteps}
            // toolOutputs={toolOutputs}
            // sources={sources}
            />
          )}
        </div>
      </div>

    </div>
  );

}
