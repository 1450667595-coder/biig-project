import { useAppStore } from '@/store/useAppStore';
import { Terminal, PanelTop, X, AlertCircle, CheckCircle2, Trash2, Copy, Check } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import AnsiOutput from './AnsiOutput';

export default function BottomPanel() {
  const {
    bottomPanelTab,
    setBottomPanelTab,
    setBottomPanelVisible,
    activeTasks,
    terminalOutput,
    clearTerminalOutput,
  } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutput, bottomPanelTab]);

  const handleCopy = async () => {
    if (!terminalOutput) return;
    try {
      await navigator.clipboard.writeText(terminalOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const tabs = [
    { id: 'terminal', label: '终端', icon: Terminal },
    { id: 'output', label: '输出', icon: PanelTop },
    { id: 'problems', label: '问题', icon: AlertCircle },
  ] as const;

  const problemCount = activeTasks.filter((t) => (t as any).status === 'failed').length;

  return (
    <div className="h-48 flex-shrink-0 flex flex-col bg-[#161b22] border-t border-[#30363d]">
      <div className="flex items-center h-8 border-b border-[#30363d] bg-[#0d1117]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = bottomPanelTab === tab.id;
          const badge = tab.id === 'problems' && problemCount > 0 ? problemCount : null;

          return (
            <button
              key={tab.id}
              onClick={() => setBottomPanelTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 h-full text-xs transition-colors border-r border-[#30363d] ${
                isActive
                  ? 'bg-[#161b22] text-[#c9d1d9] border-t-2 border-t-[#58a6ff]'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {badge && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#f85149] text-white text-[10px]">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        {bottomPanelTab === 'terminal' && terminalOutput && (
          <>
            <button
              onClick={handleCopy}
              title="复制终端输出"
              className="p-1.5 mx-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={clearTerminalOutput}
              title="清空终端"
              className="p-1.5 mx-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#f85149]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          onClick={() => setBottomPanelVisible(false)}
          className="p-1.5 mx-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-3 text-xs font-mono text-[#8b949e] whitespace-pre-wrap"
      >
        {bottomPanelTab === 'terminal' && (
          <>
            {terminalOutput ? (
              <AnsiOutput output={terminalOutput} className="text-[#c9d1d9]" />
            ) : (
              <div>
                <div className="text-[#6e7681] mb-2">BiiiG 终端已就绪。</div>
                <div className="text-[#6e7681]">在 AI 助手中要求运行命令即可在此显示输出。</div>
              </div>
            )}
          </>
        )}
        {bottomPanelTab === 'output' && (
          <div className="text-[#6e7681]">Agent 执行输出将显示在这里。</div>
        )}
        {bottomPanelTab === 'problems' && (
          <div>
            {problemCount === 0 ? (
              <div className="flex items-center gap-2 text-[#3fb950]">
                <CheckCircle2 className="w-4 h-4" />
                <span>没有发现错误</span>
              </div>
            ) : (
              <div className="text-[#f85149]">{problemCount} 个问题</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
