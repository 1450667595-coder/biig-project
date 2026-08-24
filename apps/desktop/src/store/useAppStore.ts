import { create } from 'zustand';
import { Conversation, Project, ModelConfig, ProjectTemplate, AgentTask } from '@biiig/shared';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  isDiff?: boolean;
  diffOriginal?: string;
  diffModified?: string;
}

export interface PendingDiff {
  id: string;
  path: string;
  original: string;
  modified: string;
  taskId: string;
  stepId?: string;
}

export interface SelectedSnippet {
  path: string;
  selection: string;
  startLine: number;
  endLine: number;
}

interface AppState {
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  models: ModelConfig[];
  setModels: (models: ModelConfig[]) => void;
  templates: ProjectTemplate[];
  setTemplates: (templates: ProjectTemplate[]) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  activeTasks: AgentTask[];
  setActiveTasks: (tasks: AgentTask[]) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  fileTreeVersion: number;
  refreshFileTree: () => void;

  // IDE tabs
  openTabs: OpenTab[];
  activeTabPath: string | null;
  openTab: (path: string, name: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateTabContent: (path: string, content: string, isDirty?: boolean) => void;
  markTabClean: (path: string) => void;
  getActiveTab: () => OpenTab | null;

  // Panels
  rightPanelVisible: boolean;
  setRightPanelVisible: (visible: boolean) => void;
  bottomPanelVisible: boolean;
  setBottomPanelVisible: (visible: boolean) => void;
  bottomPanelTab: 'terminal' | 'output' | 'problems';
  setBottomPanelTab: (tab: 'terminal' | 'output' | 'problems') => void;

  // Terminal / Agent output
  terminalOutput: string;
  appendTerminalOutput: (chunk: string) => void;
  clearTerminalOutput: () => void;

  // Pending diffs
  pendingDiffs: PendingDiff[];
  addPendingDiff: (diff: PendingDiff) => void;
  removePendingDiff: (id: string) => void;
  openDiffTab: (path: string, original: string, modified: string) => void;

  // Inline edit context
  selectedSnippet: SelectedSnippet | null;
  setSelectedSnippet: (snippet: SelectedSnippet | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiBaseUrl: '/api',
  setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  currentConversation: null,
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  models: [],
  setModels: (models) => set({ models }),
  templates: [],
  setTemplates: (templates) => set({ templates }),
  selectedModel: 'deepseek/deepseek-chat',
  setSelectedModel: (model) => set({ selectedModel: model }),
  activeTasks: [],
  setActiveTasks: (tasks) => set({ activeTasks: tasks }),
  activeView: 'chat',
  setActiveView: (view) => set({ activeView: view }),
  fileTreeVersion: 0,
  refreshFileTree: () => set((state) => ({ fileTreeVersion: state.fileTreeVersion + 1 })),

  openTabs: [],
  activeTabPath: null,
  openTab: (path, name, content) => {
    const exists = get().openTabs.find((t) => t.path === path);
    if (exists) {
      set({ activeTabPath: path });
      return;
    }
    const tab: OpenTab = { path, name, content, isDirty: false };
    set({ openTabs: [...get().openTabs, tab], activeTabPath: path });
  },
  closeTab: (path) => {
    const tabs = get().openTabs.filter((t) => t.path !== path);
    let active = get().activeTabPath;
    if (active === path) {
      active = tabs.length > 0 ? tabs[tabs.length - 1].path : null;
    }
    set({ openTabs: tabs, activeTabPath: active });
  },
  setActiveTab: (path) => set({ activeTabPath: path }),
  updateTabContent: (path, content, isDirty = true) => {
    set({
      openTabs: get().openTabs.map((t) =>
        t.path === path ? { ...t, content, isDirty } : t,
      ),
    });
  },
  markTabClean: (path) => {
    set({
      openTabs: get().openTabs.map((t) =>
        t.path === path ? { ...t, isDirty: false } : t,
      ),
    });
  },
  getActiveTab: () => get().openTabs.find((t) => t.path === get().activeTabPath) || null,

  rightPanelVisible: true,
  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
  bottomPanelVisible: true,
  setBottomPanelVisible: (visible) => set({ bottomPanelVisible: visible }),
  bottomPanelTab: 'terminal',
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),

  terminalOutput: '',
  appendTerminalOutput: (chunk) =>
    set((state) => ({ terminalOutput: state.terminalOutput + chunk })),
  clearTerminalOutput: () => set({ terminalOutput: '' }),

  pendingDiffs: [],
  addPendingDiff: (diff) =>
    set((state) => ({ pendingDiffs: [...state.pendingDiffs, diff] })),
  removePendingDiff: (id) =>
    set((state) => ({ pendingDiffs: state.pendingDiffs.filter((d) => d.id !== id) })),
  openDiffTab: (path, original, modified) => {
    const tabPath = `diff://${path}`;
    const exists = get().openTabs.find((t) => t.path === tabPath);
    if (exists) {
      set({ activeTabPath: tabPath });
      return;
    }
    const tab: OpenTab = {
      path: tabPath,
      name: `Diff: ${path.split('/').pop() || path}`,
      content: modified,
      isDirty: false,
      isDiff: true,
      diffOriginal: original,
      diffModified: modified,
    };
    set({ openTabs: [...get().openTabs, tab], activeTabPath: tabPath });
  },

  selectedSnippet: null,
  setSelectedSnippet: (snippet) => set({ selectedSnippet: snippet }),
}));
