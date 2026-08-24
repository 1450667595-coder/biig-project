import { useAppStore } from '@/store/useAppStore';
import { Bot, LayoutTemplate, Folder, Sparkles, Zap, Shield } from 'lucide-react';

const highlights = [
  { icon: Bot, title: '多模型对话', desc: 'DeepSeek / 豆包 / 通义千问 智能路由' },
  { icon: Zap, title: 'Agent 自动执行', desc: '任务拆解、文件/终端工具调用' },
  { icon: LayoutTemplate, title: '项目模板库', desc: '通用技术模板一键生成' },
  { icon: Shield, title: '三档审批模式', desc: '自动、建议、手动三级安全控制' },
];

const quickPrompts = [
  '创建一个 React + TypeScript 项目',
  '帮我写一个用户登录接口',
  '优化这段代码的性能',
  '为项目生成单元测试',
];

export default function WelcomePanel() {
  const { setActiveView, setCurrentConversation, conversations } = useAppStore();

  const startChat = (text?: string) => {
    setActiveView('chat');
    if (conversations.length > 0) {
      setCurrentConversation(conversations[0]);
    }
    // 实际输入需要交给 ChatPanel 处理，这里只做视图切换
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea && text) {
        (textarea as HTMLTextAreaElement).value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    }, 50);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-5">
            <img src="/logo.png" alt="BiiiG" className="w-10 h-10 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">欢迎使用 BiiiG</h1>
          <p className="text-slate-400">AI-native IDE，让垂直行业开发更简单</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="p-2 rounded-lg bg-slate-800 text-sky-400">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-200">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>快速开始</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => startChat(prompt)}
                className="text-left px-4 py-3 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/60 text-sm text-slate-300 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveView('templates')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            浏览模板
          </button>
          <button
            onClick={() => startChat()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            新建对话
          </button>
          <button
            onClick={() => setActiveView('files')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            <Folder className="w-4 h-4" />
            项目文件
          </button>
        </div>
      </div>
    </div>
  );
}
