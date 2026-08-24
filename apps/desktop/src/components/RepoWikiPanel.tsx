import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/api/client';
import { Search, RefreshCw, Loader2, FileText, AlertCircle } from 'lucide-react';

interface WikiResult {
  filePath: string;
  content: string;
  score: number;
}

export default function RepoWikiPanel() {
  const { currentProject } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikiResult[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');

  const handleIndex = async () => {
    if (!currentProject) {
      setStatus('请先选择一个项目');
      return;
    }
    setIndexing(true);
    setStatus('正在索引项目代码...');
    try {
      await api.indexRepoWiki(currentProject.id);
      setStatus('索引完成');
    } catch (err: any) {
      setStatus(`索引失败: ${err.message}`);
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!currentProject) {
      setStatus('请先选择一个项目');
      return;
    }
    if (!query.trim()) return;
    setSearching(true);
    setStatus('');
    try {
      const data = await api.searchRepoWiki(currentProject.id, query.trim());
      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setStatus('未找到相关代码，请先索引项目');
      }
    } catch (err: any) {
      setStatus(`搜索失败: ${err.message}`);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Repo Wiki</h1>
        <p className="text-sm text-slate-500 mb-6">代码知识库：索引项目文件并通过语义搜索快速定位代码</p>

        {!currentProject ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">请先选择一个项目</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-200">当前项目</div>
                <div className="text-xs text-slate-500 mt-0.5">{currentProject.name}</div>
              </div>
              <button
                onClick={handleIndex}
                disabled={indexing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {indexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {indexing ? '索引中' : '重新索引'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索代码，例如：用户登录逻辑"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                搜索
              </button>
            </div>

            {status && (
              <div className="text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2">
                {status}
              </div>
            )}

            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium text-slate-200">{r.filePath}</span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      score {(r.score || 0).toFixed(2)}
                    </span>
                  </div>
                  <pre className="text-xs text-slate-400 bg-slate-950 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {r.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
