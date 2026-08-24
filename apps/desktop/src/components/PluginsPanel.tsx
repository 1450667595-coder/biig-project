import { useEffect, useState } from 'react';
import { api, Plugin } from '@/api/client';
import { Puzzle, Plus, Trash2, Power, PowerOff, Save } from 'lucide-react';

function parseEnvVars(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of input.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

export default function PluginsPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryCommand: '',
    envVars: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const list = await api.getPlugins();
      setPlugins(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createPlugin({
        name: form.name.trim(),
        description: form.description.trim(),
        entryCommand: form.entryCommand.trim(),
        envVars: parseEnvVars(form.envVars),
      });
      setForm({ name: '', description: '', entryCommand: '', envVars: '' });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlugin = async (plugin: Plugin) => {
    await api.updatePlugin(plugin.id, { isActive: !plugin.isActive });
    await refresh();
  };

  const deletePlugin = async (id: string) => {
    await api.deletePlugin(id);
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Puzzle className="w-5 h-5 text-sky-400" />
          <h1 className="text-xl font-bold text-slate-100">插件市场</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">管理本地 MCP 插件与入口命令</p>

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">安装插件</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">名称</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
                  placeholder="例如：文件系统 MCP"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">入口命令</label>
                <input
                  type="text"
                  required
                  value={form.entryCommand}
                  onChange={(e) => setForm({ ...form, entryCommand: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
                  placeholder="例如：npx -y @modelcontextprotocol/server-filesystem"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">描述</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
                placeholder="插件功能简介"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">环境变量（每行 KEY=value）</label>
              <textarea
                value={form.envVars}
                onChange={(e) => setForm({ ...form, envVars: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 font-mono"
                placeholder="API_KEY=xxx\nBASE_DIR=/workspace"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white text-sm font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? '保存中…' : '安装插件'}
            </button>
          </form>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">已安装插件</h2>
          {loading ? (
            <div className="text-xs text-slate-500">加载中…</div>
          ) : plugins.length === 0 ? (
            <div className="text-xs text-slate-500">
              暂无插件。在上方安装一个 MCP 服务器，即可在 Agent 中通过入口命令调用。
            </div>
          ) : (
            <div className="space-y-3">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex items-start justify-between gap-3 px-3 py-3 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{plugin.name}</span>
                      {plugin.isActive ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          已启用
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/30 text-slate-400 border border-slate-700/40">
                          已禁用
                        </span>
                      )}
                    </div>
                    {plugin.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{plugin.description}</p>
                    )}
                    <code className="block mt-1 text-[10px] text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded w-fit font-mono">
                      {plugin.entryCommand}
                    </code>
                    {Object.keys(plugin.envVars || {}).length > 0 && (
                      <p className="text-[10px] text-slate-600 mt-1">
                        {Object.keys(plugin.envVars).length} 个环境变量
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePlugin(plugin)}
                      title={plugin.isActive ? '禁用' : '启用'}
                      className={`p-1.5 rounded transition-colors ${
                        plugin.isActive
                          ? 'text-emerald-400 hover:bg-slate-800'
                          : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {plugin.isActive ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deletePlugin(plugin.id)}
                      title="删除"
                      className="p-1.5 rounded text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
