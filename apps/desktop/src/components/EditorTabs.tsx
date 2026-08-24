import { useAppStore } from '@/store/useAppStore';
import { X, FileCode, GitCompare } from 'lucide-react';

export default function EditorTabs() {
  const { openTabs, activeTabPath, setActiveTab, closeTab, removePendingDiff, pendingDiffs } = useAppStore();

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center h-9 bg-[#0d1117] border-b border-[#30363d] overflow-x-auto scrollbar-hide">
      {openTabs.map((tab) => {
        const isActive = activeTabPath === tab.path;
        const extension = tab.name.split('.').pop() || '';
        let iconColor = 'text-[#8b949e]';
        if (['tsx', 'ts', 'jsx', 'js'].includes(extension)) iconColor = 'text-[#58a6ff]';
        if (['css', 'scss'].includes(extension)) iconColor = 'text-[#a5d6ff]';
        if (['html'].includes(extension)) iconColor = 'text-[#ff7b72]';
        if (['json'].includes(extension)) iconColor = 'text-[#79c0ff]';
        if (['md'].includes(extension)) iconColor = 'text-[#d2a8ff]';
        if (['py'].includes(extension)) iconColor = 'text-[#ffd43b]';

        return (
          <button
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`group flex items-center gap-2 px-3 h-full min-w-[120px] max-w-[200px] text-xs border-r border-[#30363d] transition-colors ${
              isActive
                ? tab.isDiff
                  ? 'bg-[#161b22] text-[#c9d1d9] border-t-2 border-t-[#d29922]'
                  : 'bg-[#161b22] text-[#c9d1d9] border-t-2 border-t-[#58a6ff]'
                : 'bg-[#0d1117] text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
            }`}
          >
            {tab.isDiff ? (
              <GitCompare className="w-3.5 h-3.5 flex-shrink-0 text-[#d29922]" />
            ) : (
              <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
            )}
            <span className="truncate flex-1 text-left">{tab.name}</span>
            {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e] flex-shrink-0" />}
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (tab.isDiff) {
                  const realPath = tab.path.replace(/^diff:\/\//, '');
                  const diff = pendingDiffs.find((d) => d.path === realPath);
                  if (diff) removePendingDiff(diff.id);
                }
                closeTab(tab.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#30363d] text-[#8b949e] transition-opacity"
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
