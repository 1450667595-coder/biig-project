import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/api/client';
import { Wand2, FolderOpen, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ProjectTemplate, TemplateParameter } from '@biiig/shared';

interface GenerateResult {
  success?: boolean;
  error?: string;
  targetPath?: string;
  generatedFiles?: string[];
}

export default function TemplateGallery() {
  const { templates, setTemplates, currentProject, setCurrentProject, refreshFileTree } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [targetPath, setTargetPath] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || '加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const selectFolder = async () => {
    const path = await (window as any).electronAPI?.selectFolder();
    if (path) setTargetPath(path);
  };

  const generate = async () => {
    if (!selectedTemplate || !targetPath) return;
    setGenerating(true);
    try {
      const res = await api.generateTemplate(selectedTemplate.id, params, targetPath);
      setResult(res);
      if (res.success) {
        refreshFileTree();
        if (currentProject && !currentProject.localPath) {
          setCurrentProject({ ...currentProject, localPath: targetPath });
        }
      }
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const categories: Record<string, string> = {
    'web-app': 'Web 应用',
    'node-service': 'Node 服务',
    cli: 'CLI 工具',
    library: '组件库',
  };

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-sky-400" />
          通用技术模板库
        </h2>
        <button
          onClick={loadTemplates}
          disabled={loading}
          title="刷新模板"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <span className="text-sm">加载模板中...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplate(template);
              const defaults: Record<string, string> = {};
              template.parameters.forEach((p) => {
                defaults[p.name] = p.default || '';
              });
              setParams(defaults);
              setResult(null);
            }}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-sky-400 mb-1">
              {categories[template.category] || template.category}
            </div>
            <h3 className="font-medium mb-1">{template.name}</h3>
            <p className="text-sm text-slate-400">{template.description}</p>
            <div className="mt-3 flex gap-2 text-[10px] text-slate-500">
              <span className="px-2 py-0.5 bg-slate-800 rounded">{template.framework}</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded">{template.language}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-medium mb-4">生成项目：{selectedTemplate.name}</h3>

          <div className="space-y-4 mb-4">
            {selectedTemplate.parameters.map((param: TemplateParameter) => (
              <div key={param.name}>
                <label className="block text-xs text-slate-400 mb-1">{param.label}</label>
                {param.type === 'select' ? (
                  <select
                    value={params[param.name] || ''}
                    onChange={(e) =>
                      setParams({ ...params, [param.name]: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm"
                  >
                    {param.options?.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={param.type === 'color' ? 'color' : 'text'}
                    value={params[param.name] || ''}
                    onChange={(e) =>
                      setParams({ ...params, [param.name]: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs text-slate-400 mb-1">目标目录</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="选择或输入目录"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm"
                />
                <button
                  onClick={selectFolder}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={generating || !targetPath}
            className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                一键生成项目
              </>
            )}
          </button>

          {result && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-sm">
              {result.error ? (
                <span className="text-red-400">错误：{result.error}</span>
              ) : (
                <div className="flex items-start gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>生成成功</p>
                    <p className="text-xs text-slate-400 mt-1">路径：{result.targetPath}</p>
                    <p className="text-xs text-slate-400">
                      文件数：{result.generatedFiles?.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
