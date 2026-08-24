import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/api/client';
import { X, FolderOpen, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectDialog({ open, onClose }: Props) {
  const { projects, setProjects, setCurrentProject } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const selectFolder = async () => {
    const path = await (window as any).electronAPI?.selectFolder();
    if (path) setLocalPath(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        localPath: localPath.trim() || `/tmp/biiig-workspace/${name.trim()}`,
      });
      setProjects([project, ...projects]);
      setCurrentProject(project);
      setName('');
      setDescription('');
      setLocalPath('');
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">创建新项目</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">项目名称</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：BiiiG AI 项目"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述项目用途..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">本地目录</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="选择或输入目录"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={selectFolder}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-slate-300"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
