import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Loader2,
  Cpu,
  Plus,
  MessageSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  FileCode,
  Terminal,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/api/client';
import { AgentPlan, AgentStep } from '@biiig/shared';
import ModelSelector from './ModelSelector';
import TerminalOutput from './TerminalOutput';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  isStreaming?: boolean;
}

type Mode = 'chat' | 'agent' | 'builder';

const statusText: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  waiting_approval: '等待确认',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const modeLabels: Record<Mode, string> = {
  chat: '对话',
  agent: 'Agent',
  builder: 'Builder',
};

export default function ChatPanel() {
  const {
    currentConversation,
    setCurrentConversation,
    conversations,
    setConversations,
    selectedModel,
    currentProject,
    refreshFileTree,
    activeTabPath,
    openTabs,
    setBottomPanelVisible,
    setBottomPanelTab,
    terminalOutput,
    appendTerminalOutput,
    clearTerminalOutput,
    addPendingDiff,
    openDiffTab,
    pendingDiffs,
    removePendingDiff,
    selectedSnippet,
    setSelectedSnippet,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<Mode>('agent');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [agentError, setAgentError] = useState<string>('');
  const [showPlan, setShowPlan] = useState(true);
  const [showConversations, setShowConversations] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentConversation) {
      setMessages(
        (currentConversation as any).messages?.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })) || [],
      );
      setMode((currentConversation as any).mode || 'agent');
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentStatus, agentSteps, terminalOutput]);

  const createConversation = async (title = 'New Chat') => {
    const conversation = await api.createConversation({
      title,
      projectId: currentProject?.id,
      mode,
      model: selectedModel,
    });
    setConversations([conversation, ...conversations]);
    setCurrentConversation(conversation);
    return conversation;
  };

  const handleNewChat = async () => {
    if (isLoading) return;
    setMessages([]);
    setAgentPlan(null);
    setAgentSteps([]);
    setAgentStatus('');
    clearTerminalOutput();
    await createConversation('New Chat');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.deleteConversation(id);
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (currentConversation?.id === id) {
      setCurrentConversation(next[0] || null);
    }
  };

  const handleModeChange = async (newMode: Mode) => {
    setMode(newMode);
    if (currentConversation) {
      await api.updateConversation(currentConversation.id, { mode: newMode });
    }
  };

  const buildContextPrompt = () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    const projectInfo = currentProject ? `Project: ${currentProject.name} (${currentProject.localPath || ''})` : '';
    const fileInfo = activeTab
      ? `Current file: ${activeTab.path}\n\n${activeTab.content.slice(0, 4000)}`
      : '';
    const snippetInfo = selectedSnippet
      ? `Selected code in ${selectedSnippet.path} (lines ${selectedSnippet.startLine}-${selectedSnippet.endLine}):\n\`\`\`\n${selectedSnippet.selection}\n\`\`\``
      : '';
    return [projectInfo, fileInfo, snippetInfo].filter(Boolean).join('\n\n');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const conversation = currentConversation || (await createConversation(input.slice(0, 30)));

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (mode === 'agent' || mode === 'builder') {
      const fullPrompt = `${buildContextPrompt()}\n\nUser request: ${input}`;
      setSelectedSnippet(null);
      await runAgent(conversation.id, fullPrompt);
    } else {
      const fullPrompt = `${buildContextPrompt()}\n\nUser request: ${input}`;
      setSelectedSnippet(null);
      await streamChat(conversation.id, fullPrompt);
    }
  };

  const streamChat = async (conversationId: string, content: string) => {
    setIsLoading(true);
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await api.postMessageStream(
        conversationId,
        content,
        selectedModel,
        mode,
      );
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + (event.content || '') }
                    : m,
                ),
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m,
                ),
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + `\n\nError: ${event.error}`, isStreaming: false }
                    : m,
                ),
              );
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runAgent = async (conversationId: string, description: string) => {
    setIsLoading(true);
    setAgentStatus('创建任务中...');
    setAgentPlan(null);
    setAgentSteps([]);
    setCurrentStepIndex(-1);
    setAgentError('');
    clearTerminalOutput();
    setBottomPanelVisible(true);
    setBottomPanelTab('terminal');

    try {
      const task = await api.createAgentTask({
        conversationId,
        description,
        approvalMode: 'suggest',
        workspacePath: currentProject?.localPath || '/tmp/biiig-workspace',
        projectId: currentProject?.id,
      });
      setAgentStatus('任务已创建，开始执行');

      const source = api.executeAgentTask(task.id);
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'plan') {
            setAgentPlan(data.data);
            setAgentSteps(data.data.steps || []);
            setAgentStatus(`计划生成完成：${(data.data.steps || []).length} 个步骤`);
          } else if (data.type === 'thinking') {
            setAgentStatus(`思考中... ${data.chunk || ''}`);
          } else if (data.type === 'step_update') {
            const idx = data.stepIndex ?? -1;
            const step = data.step as AgentStep;
            setCurrentStepIndex(idx);
            setAgentSteps((prev) => {
              const next = [...prev];
              if (idx >= 0 && idx < next.length) {
                next[idx] = { ...next[idx], ...step };
              } else if (idx === next.length && step) {
                next.push(step);
              }
              return next;
            });
            if (data.needsApproval && data.diff) {
              const diff = data.diff as { path: string; original: string; modified: string };
              addPendingDiff({
                id: `${task.id}-${idx}`,
                path: diff.path,
                original: diff.original,
                modified: diff.modified,
                taskId: task.id,
                stepId: step.id,
              });
              openDiffTab(diff.path, diff.original, diff.modified);
            }
            setAgentStatus(
              `步骤 ${idx + 1}${step.description ? `：${step.description}` : ''} (${statusText[step.status] || step.status})`,
            );
          } else if (data.type === 'step_output') {
            appendTerminalOutput(data.chunk || '');
          } else if (data.type === 'status') {
            setAgentStatus(`任务状态: ${statusText[data.status] || data.status}`);
          } else if (data.type === 'done') {
            setAgentStatus('任务完成');
            setIsLoading(false);
            refreshFileTree();
            source.close();
          } else if (data.type === 'error') {
            setAgentError(data.error || '任务执行出错');
            setAgentStatus('任务失败');
            setIsLoading(false);
            source.close();
          }
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        setAgentStatus('任务流发生错误');
        setIsLoading(false);
      };
    } catch (err: any) {
      setAgentStatus(`错误: ${err.message}`);
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: AgentStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />;
    }
    if (step.status === 'failed') {
      return <XCircle className="w-3.5 h-3.5 text-[#f85149]" />;
    }
    if (step.status === 'running' || index === currentStepIndex) {
      return <Loader2 className="w-3.5 h-3.5 text-[#58a6ff] animate-spin" />;
    }
    if (step.status === 'waiting_approval') {
      return <Clock className="w-3.5 h-3.5 text-[#d29922]" />;
    }
    return <Play className="w-3.5 h-3.5 text-[#6e7681]" />;
  };

  const getToolIcon = (toolName?: string) => {
    if (toolName === 'read_file' || toolName === 'write_file') {
      return <FileCode className="w-3 h-3" />;
    }
    if (toolName === 'execute_command') {
      return <Terminal className="w-3 h-3" />;
    }
    return <Cpu className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      {/* Header */}
      <div className="h-10 border-b border-[#30363d] flex items-center justify-between px-3 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#58a6ff]" />
          <span className="text-xs font-semibold text-[#c9d1d9]">AI 助手</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ModelSelector />
          <button
            onClick={handleNewChat}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
            title="新建对话"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center bg-[#0d1117] rounded-md border border-[#30363d] p-0.5">
            {(['chat', 'agent', 'builder'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  mode === m
                    ? 'bg-[#388bfd]/15 text-[#58a6ff]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversations */}
      {conversations.length > 0 && (
        <div className="border-b border-[#30363d]">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#8b949e] hover:bg-[#0d1117] transition-colors"
          >
            <span className="font-medium">对话列表</span>
            {showConversations ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showConversations && (
            <div className="px-2 pb-2 space-y-0.5 max-h-32 overflow-y-auto">
              {conversations.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrentConversation(c)}
                  className={`group w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors ${
                    currentConversation?.id === c.id
                      ? 'bg-[#388bfd]/15 text-[#58a6ff]'
                      : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
                  }`}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <span
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[#f85149] p-1 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !agentPlan && (
          <div className="text-center text-[#6e7681] mt-10">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[#8b949e]">
              {currentConversation ? '开始输入第一条消息' : '新建或选择一个对话'}
            </p>
            <p className="text-xs mt-2 px-6">
              {mode === 'chat'
                ? '询问代码问题，或让 AI 解释当前文件'
                : mode === 'agent'
                  ? '例如：帮我把这个函数改成异步，并添加错误处理'
                  : '例如：用 React + TypeScript 创建一个 TODO 应用'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-[#1f6feb]' : 'bg-[#21262d] border border-[#30363d]'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-[#58a6ff]" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1f6feb] text-white'
                  : 'bg-[#21262d] border border-[#30363d] text-[#c9d1d9]'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[#30363d]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              {msg.isStreaming && (
                <span className="inline-block w-1 h-3 bg-[#58a6ff] ml-1 animate-pulse" />
              )}
            </div>
          </div>
        ))}

        {/* Agent plan */}
        {(agentStatus || agentPlan) && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPlan(!showPlan)}
              className="w-full px-3 py-2 border-b border-[#30363d] flex items-center justify-between text-xs text-[#c9d1d9] hover:bg-[#161b22] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span className="font-medium">{agentStatus || 'Agent 执行中...'}</span>
              </div>
              {showPlan ? <ChevronUp className="w-3 h-3 text-[#6e7681]" /> : <ChevronDown className="w-3 h-3 text-[#6e7681]" />}
            </button>

            {showPlan && agentSteps.length > 0 && (
              <div className="p-2 space-y-1">
                {agentSteps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className={`rounded border px-2 py-1.5 text-[11px] transition-colors ${
                      idx === currentStepIndex
                        ? 'border-[#58a6ff]/50 bg-[#388bfd]/10'
                        : step.status === 'completed'
                          ? 'border-[#3fb950]/30 bg-[#3fb950]/5'
                          : step.status === 'failed'
                            ? 'border-[#f85149]/30 bg-[#f85149]/5'
                            : 'border-[#30363d] bg-[#161b22]/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getStepIcon(step, idx)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#c9d1d9]">步骤 {idx + 1}</span>
                          {step.tool && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                              {getToolIcon(step.tool)}
                              {step.tool}
                            </span>
                          )}
                          <span
                            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                              step.status === 'completed'
                                ? 'bg-[#3fb950]/15 text-[#3fb950]'
                                : step.status === 'failed'
                                  ? 'bg-[#f85149]/15 text-[#f85149]'
                                  : step.status === 'running'
                                    ? 'bg-[#58a6ff]/15 text-[#58a6ff]'
                                    : step.status === 'waiting_approval'
                                      ? 'bg-[#d29922]/15 text-[#d29922]'
                                      : 'bg-[#21262d] text-[#8b949e]'
                            }`}
                          >
                            {statusText[step.status] || step.status}
                          </span>
                        </div>
                        <p className="text-[#8b949e] mt-0.5 leading-relaxed">{step.description}</p>
                        {step.result && (
                          <div className="mt-1.5 p-1.5 rounded bg-[#0d1117] text-[#6e7681] font-mono max-h-24 overflow-y-auto text-[10px]">
                            {step.result}
                          </div>
                        )}
                        {step.error && (
                          <div className="mt-1.5 p-1.5 rounded bg-[#f85149]/10 text-[#f85149] flex items-start gap-1.5 text-[10px]">
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            {step.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {agentError && (
              <div className="px-3 pb-3">
                <div className="p-2 rounded bg-[#f85149]/10 text-[#f85149] text-xs flex items-start gap-1.5">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {agentError}
                </div>
              </div>
            )}

            {terminalOutput && (
              <div className="px-3 pb-3">
                <TerminalOutput output={terminalOutput} />
              </div>
            )}

            {pendingDiffs.length > 0 && (
              <div className="px-3 pb-3 space-y-2">
                <div className="text-xs text-[#8b949e] font-medium">待确认的变更</div>
                {pendingDiffs.map((diff) => (
                  <div
                    key={diff.id}
                    className="rounded-md border border-[#30363d] bg-[#161b22] p-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-[#c9d1d9] truncate">{diff.path}</div>
                      <div className="text-[10px] text-[#6e7681]">在编辑器标签页中查看差异</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={async () => {
                          await api.rejectAgentTask(diff.taskId);
                          removePendingDiff(diff.id);
                        }}
                        className="px-2 py-1 rounded text-[10px] bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        拒绝
                      </button>
                      <button
                        onClick={async () => {
                          await api.approveAgentTask(diff.taskId);
                          removePendingDiff(diff.id);
                          refreshFileTree();
                        }}
                        className="px-2 py-1 rounded text-[10px] bg-[#238636] text-white hover:bg-[#2ea043] flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        接受
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {selectedSnippet && (
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#388bfd]/10 border border-[#58a6ff]/20 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#58a6ff] truncate">
              <FileCode className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                已引用 {selectedSnippet.path} 第 {selectedSnippet.startLine}-{selectedSnippet.endLine} 行
              </span>
            </div>
            <button
              onClick={() => setSelectedSnippet(null)}
              className="p-0.5 rounded hover:bg-[#58a6ff]/20 text-[#58a6ff]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input p-3 border-t border-[#30363d] bg-[#161b22]">
        <div className="flex items-end gap-2 bg-[#0d1117] rounded-lg border border-[#30363d] p-2 focus-within:border-[#58a6ff] focus-within:ring-1 focus-within:ring-[#58a6ff]/20 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              mode === 'agent'
                ? '输入任务，例如：把当前函数改成 async/await'
                : mode === 'builder'
                  ? '描述你想构建的应用...'
                  : '输入问题或指令...'
            }
            className="flex-1 bg-transparent border-none outline-none resize-none text-xs max-h-28 py-1.5 px-1 text-[#c9d1d9] placeholder-[#6e7681]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-[#1f6feb] text-white rounded-md hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[#6e7681] px-1">
          <span>Shift + Enter 换行 · 自动携带当前文件上下文</span>
          <span>{mode === 'agent' ? 'Agent 模式：自动规划并执行' : mode === 'builder' ? 'Builder：从零构建项目' : '对话模式'}</span>
        </div>
      </div>
    </div>
  );
}
