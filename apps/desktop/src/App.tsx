import { useEffect } from 'react';
import { api } from '@/api/client';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/Sidebar';
import ProjectFiles from '@/components/ProjectFiles';
import TemplateGallery from '@/components/TemplateGallery';
import SettingsPanel from '@/components/SettingsPanel';
import RepoWikiPanel from '@/components/RepoWikiPanel';
import PluginsPanel from '@/components/PluginsPanel';
import EditorTabs from '@/components/EditorTabs';
import CodeEditor from '@/components/CodeEditor';
import DiffEditorTab from '@/components/DiffEditorTab';
import ChatPanel from '@/components/ChatPanel';
import BottomPanel from '@/components/BottomPanel';
import { Toaster } from 'sonner';

function App() {
  const {
    setProjects,
    setConversations,
    setModels,
    setTemplates,
    currentProject,
    rightPanelVisible,
    bottomPanelVisible,
    openTabs,
    activeTabPath,
    updateTabContent,
    markTabClean,
    activeView,
  } = useAppStore();

  useEffect(() => {
    Promise.all([
      api.getProjects(),
      api.getConversations(),
      api.getModels(),
      api.getTemplates(),
    ]).then(([projects, conversations, models, templates]) => {
      setProjects(projects);
      setConversations(conversations);
      setModels(models);
      setTemplates(templates);
    });
  }, []);

  const activeTab = openTabs.find((t) => t.path === activeTabPath) || null;

  return (
    <div className="flex h-screen w-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans">
      <Toaster position="top-right" richColors />

      {/* Left icon sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top title bar */}
        <header className="h-10 border-b border-[#30363d] bg-[#161b22] flex items-center px-3 justify-between select-none">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BiiiG" className="h-5 w-5 rounded-md" />
            <span className="font-semibold text-sm text-[#58a6ff]">BiiiG</span>
            {currentProject && (
              <>
                <span className="text-[#484f58]">/</span>
                <span className="text-xs text-[#8b949e] truncate max-w-[240px]">{currentProject.name}</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-[#6e7681]">
            AI Native IDE — Deep Research · Code · Build
          </div>
        </header>

        {/* Main workspace */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel */}
          <div className="w-64 flex-shrink-0 border-r border-[#30363d] bg-[#0d1117]">
            {(activeView === 'chat' || activeView === 'files' || activeView === undefined) && <ProjectFiles />}
            {activeView === 'templates' && <TemplateGallery />}
            {activeView === 'wiki' && <RepoWikiPanel />}
            {activeView === 'plugins' && <PluginsPanel />}
            {activeView === 'settings' && <SettingsPanel />}
          </div>

          {/* Center editor */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
            <EditorTabs />
            <div className="flex-1 min-h-0">
              {activeTab ? (
                activeTab.isDiff ? (
                  <DiffEditorTab tab={activeTab} />
                ) : (
                  <CodeEditor
                    key={activeTab.path}
                    path={activeTab.path}
                    content={activeTab.content}
                    isDirty={activeTab.isDirty}
                    onChange={(content) => updateTabContent(activeTab.path, content, true)}
                    onSave={async (content) => {
                      if (!currentProject) return;
                      await api.saveProjectFileContent(currentProject.id, activeTab.path, content);
                      markTabClean(activeTab.path);
                    }}
                  />
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#6e7681]">
                  <img src="/logo.png" alt="BiiiG" className="h-16 w-16 rounded-2xl mb-4 opacity-30" />
                  <p className="text-sm">打开或创建一个文件开始编码</p>
                  <p className="text-xs mt-2 text-[#484f58]">
                    在右侧 AI 助手输入需求，BiiiG 自动帮你写代码
                  </p>
                </div>
              )}
            </div>

            {/* Bottom panel */}
            {bottomPanelVisible && <BottomPanel />}
          </div>

          {/* Right AI panel */}
          {rightPanelVisible && (
            <div className="w-[420px] flex-shrink-0 border-l border-[#30363d] bg-[#161b22]">
              <ChatPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
