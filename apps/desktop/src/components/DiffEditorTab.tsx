import { useAppStore } from '@/store/useAppStore';
import { api } from '@/api/client';
import DiffViewer from './DiffViewer';
import { Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  tab: {
    path: string;
    diffOriginal?: string;
    diffModified?: string;
  };
}

export default function DiffEditorTab({ tab }: Props) {
  const { pendingDiffs, removePendingDiff, closeTab, refreshFileTree } = useAppStore();
  const [processing, setProcessing] = useState(false);

  const realPath = tab.path.replace(/^diff:\/\//, '');
  const pendingDiff = pendingDiffs.find((d) => d.path === realPath);

  const original = tab.diffOriginal || '';
  const modified = tab.diffModified || '';

  const handleApply = async () => {
    if (!pendingDiff) {
      toast.error('未找到对应的 Agent 变更');
      return;
    }
    setProcessing(true);
    try {
      await api.approveAgentTask(pendingDiff.taskId);
      removePendingDiff(pendingDiff.id);
      closeTab(tab.path);
      refreshFileTree();
      toast.success('已应用变更');
    } catch (err: any) {
      toast.error(err.message || '应用失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!pendingDiff) {
      closeTab(tab.path);
      return;
    }
    setProcessing(true);
    try {
      await api.rejectAgentTask(pendingDiff.taskId);
      removePendingDiff(pendingDiff.id);
      closeTab(tab.path);
      toast.success('已拒绝变更');
    } catch (err: any) {
      toast.error(err.message || '拒绝失败');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 h-9 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#8b949e] truncate">{realPath}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d29922]/15 text-[#d29922]">
            等待确认
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] disabled:opacity-50 transition-colors"
          >
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            拒绝
          </button>
          <button
            onClick={handleApply}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs bg-[#238636] text-white hover:bg-[#2ea043] disabled:opacity-50 transition-colors"
          >
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            应用变更
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <DiffViewer path={realPath} original={original} modified={modified} />
      </div>
    </div>
  );
}
