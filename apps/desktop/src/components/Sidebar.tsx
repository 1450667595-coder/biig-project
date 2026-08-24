import { useAppStore } from '@/store/useAppStore';
import {
  Bot,
  Folder,
  LayoutTemplate,
  Settings,
  BookOpen,
  Puzzle,
  Plus,
  PanelRight,
  PanelBottom,
} from 'lucide-react';
import { api } from '@/api/client';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export default function Sidebar() {
  const {
    activeView,
    setActiveView,
    conversations,
    setConversations,
    setCurrentConversation,
    currentProject,
    rightPanelVisible,
    setRightPanelVisible,
    bottomPanelVisible,
    setBottomPanelVisible,
  } = useAppStore();

  const navItems: NavItem[] = [
    { id: 'chat', label: 'AI 助手', icon: Bot },
    { id: 'files', label: '文件', icon: Folder },
    { id: 'templates', label: '模板库', icon: LayoutTemplate },
    { id: 'wiki', label: '知识库', icon: BookOpen },
    { id: 'plugins', label: '插件市场', icon: Puzzle },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  const createConversation = async () => {
    const conversation = await api.createConversation({
      title: 'New Chat',
      projectId: currentProject?.id,
      mode: 'chat',
      model: 'deepseek/deepseek-chat',
    });
    setConversations([conversation, ...conversations]);
    setCurrentConversation(conversation);
    setActiveView('chat');
    setRightPanelVisible(true);
  };

  return (
    <aside className="w-12 flex-shrink-0 bg-[#0d1117] border-r border-[#30363d] flex flex-col items-center py-2 z-10">
      <div className="mb-3">
        <img
          src="/logo.png"
          alt="BiiiG"
          className="w-7 h-7 rounded-lg shadow-lg shadow-black/40"
        />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 w-full px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex items-center justify-center p-2 rounded-lg transition-all group ${
                isActive
                  ? 'bg-[#388bfd]/15 text-[#58a6ff]'
                  : 'text-[#6e7681] hover:bg-[#161b22] hover:text-[#c9d1d9]'
              }`}
              title={item.label}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#161b22] text-[#c9d1d9] text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-[#30363d]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 w-full px-1.5 pb-2">
        <button
          onClick={() => setBottomPanelVisible(!bottomPanelVisible)}
          className={`flex items-center justify-center p-2 rounded-lg transition-colors relative group ${
            bottomPanelVisible ? 'text-[#58a6ff] bg-[#388bfd]/10' : 'text-[#6e7681] hover:bg-[#161b22] hover:text-[#c9d1d9]'
          }`}
          title="切换底部面板"
        >
          <PanelBottom className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={() => setRightPanelVisible(!rightPanelVisible)}
          className={`flex items-center justify-center p-2 rounded-lg transition-colors relative group ${
            rightPanelVisible ? 'text-[#58a6ff] bg-[#388bfd]/10' : 'text-[#6e7681] hover:bg-[#161b22] hover:text-[#c9d1d9]'
          }`}
          title="切换右侧面板"
        >
          <PanelRight className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={createConversation}
          className="flex items-center justify-center p-2 rounded-lg bg-[#238636] text-white hover:bg-[#2ea043] transition-colors relative group"
          title="新建对话"
        >
          <Plus className="w-4.5 h-4.5" />
          <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#161b22] text-[#c9d1d9] text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-[#30363d]">
            新建对话
          </span>
        </button>
      </div>
    </aside>
  );
}
