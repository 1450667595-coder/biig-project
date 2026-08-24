import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Folder, FileCode, Plus, FolderOpen, ChevronRight, ChevronDown, Loader2, AlertCircle, Search, Database } from 'lucide-react';
import CreateProjectDialog from './CreateProjectDialog';
import { api } from '@/api/client';

interface FileNode {
  name: string;
  type: 'directory' | 'file';
  path: string;
  children?: FileNode[];
}

export default function ProjectFiles() {
  const { projects, currentProject, setCurrentProject, fileTreeVersion, openTab, activeView } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const mergeTree = (prev: FileNode[], parentPath: string, items: FileNode[]): FileNode[] => {
    if (!parentPath) return items;

    const insert = (nodes: FileNode[]): FileNode[] =>
      nodes.map((node) => {
        if (node.type === 'directory' && (parentPath.startsWith(node.path + '/') || parentPath === node.path)) {
          return {
            ...node,
            children: node.path === parentPath ? items : insert(node.children || []),
          };
        }
        return node;
      });

    return insert(prev);
  };

  const [pathMissing, setPathMissing] = useState(false);

  const loadDirectory = useCallback(async (path = '') => {
    if (!currentProject) return;
    setLoading(true);
    setError('');
    setPathMissing(false);
    try {
      const data = await api.getProjectFiles(currentProject.id, path);
      if (data.type === 'directory') {
        setTree((prev) => mergeTree(prev, path, data.items || []));
      }
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Path not found')) {
        setPathMissing(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      loadDirectory();
      setExpanded(new Set());
    } else {
      setTree([]);
      setExpanded(new Set());
      setPathMissing(false);
    }
  }, [currentProject, loadDirectory, fileTreeVersion]);

  const toggleDir = async (node: FileNode) => {
    const next = new Set(expanded);
    if (next.has(node.path)) {
      next.delete(node.path);
    } else {
      next.add(node.path);
      if (!node.children) {
        await loadDirectory(node.path);
      }
    }
    setExpanded(next);
  };

  const openFile = async (node: FileNode) => {
    if (!currentProject) return;
    try {
      const data = await api.getProjectFileContent(currentProject.id, node.path);
      openTab(data.path, node.name, data.content);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleIndexProject = async () => {
    if (!currentProject || indexing) return;
    setIndexing(true);
    setError('');
    try {
      await api.indexRepoWiki(currentProject.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIndexing(false);
    }
  };

  const matchesSearch = (node: FileNode) => {
    if (!search) return true;
    return node.name.toLowerCase().includes(search.toLowerCase());
  };

  const renderNode = (node: FileNode, depth = 0) => {
    if (!matchesSearch(node)) return null;
    const isExpanded = expanded.has(node.path);
    const paddingLeft = depth * 12 + 8;

    return (
      <div key={node.path}>
        <button
          onClick={() => (node.type === 'directory' ? toggleDir(node) : openFile(node))}
          style={{ paddingLeft }}
          className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded-sm text-left text-xs transition-colors ${
            activeView === 'files' && node.type === 'file'
              ? 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
              : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
          }`}
        >
          {node.type === 'directory' ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 flex-shrink-0 text-[#6e7681]" />
            ) : (
              <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#6e7681]" />
            )
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}
          {node.type === 'directory' ? (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#79c0ff] flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-[#79c0ff] flex-shrink-0" />
            )
          ) : (
            <FileCode className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <CreateProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <h2 className="text-xs font-semibold text-[#c9d1d9]">资源管理器</h2>
        <div className="flex items-center gap-1">
          {currentProject && (
            <button
              onClick={handleIndexProject}
              disabled={indexing}
              title="索引项目知识库"
              className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors disabled:opacity-50"
            >
              {indexing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={() => setDialogOpen(true)}
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-2 py-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e]">
          <Search className="w-3 h-3" />
          <input
            type="text"
            placeholder="搜索文件"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-[#c9d1d9] placeholder-[#6e7681] w-full"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#6e7681] px-4">
          <Folder className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-xs mb-3 text-center">暂无项目</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-3 py-1.5 rounded-md bg-[#238636] text-white text-xs hover:bg-[#2ea043] transition-colors"
          >
            创建项目
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-1 pb-2">
          <div className="space-y-0.5 mb-3 px-1">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                  currentProject?.id === project.id
                    ? 'bg-[#388bfd]/15 text-[#58a6ff]'
                    : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
                }`}
              >
                {currentProject?.id === project.id ? (
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-[#79c0ff]" />
                ) : (
                  <Folder className="w-3.5 h-3.5 flex-shrink-0 text-[#6e7681]" />
                )}
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>

          {currentProject && pathMissing && (
            <div className="mx-2 mb-3 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/20 text-[11px] text-[#f85149]">
              <div className="font-medium mb-1">项目路径不存在</div>
              <div className="text-[#f85149]/80 mb-2 break-all">{currentProject.localPath}</div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await (window as any).electronAPI?.selectFolder();
                      loadDirectory();
                    } catch {
                      loadDirectory();
                    }
                  }}
                  className="px-2 py-1 rounded bg-[#f85149]/20 hover:bg-[#f85149]/30 text-white text-[10px] transition-colors"
                >
                  重新选择目录
                </button>
                <button
                  onClick={() => setPathMissing(false)}
                  className="px-2 py-1 rounded hover:bg-[#f85149]/10 text-[#f85149] text-[10px] transition-colors"
                >
                  忽略
                </button>
              </div>
            </div>
          )}

          {currentProject && !pathMissing && (
            <div>
              <div className="text-[10px] font-medium text-[#6e7681] uppercase tracking-wider mb-1 px-2">
                {currentProject.name}
              </div>
              {tree.map((node) => renderNode(node))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f851491a] text-[#f85149] text-xs border-t border-[#f8514933]">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
