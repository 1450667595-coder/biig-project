import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Key, Server, Database, Shield, Save, Plus, Cpu, Pencil } from 'lucide-react';
import { ModelConfig } from '@biiig/shared';
import { api } from '@/api/client';
import ModelConfigDialog from './ModelConfigDialog';

export default function SettingsPanel() {
  const { apiBaseUrl, setApiBaseUrl, models, setModels } = useAppStore();
  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [saved, setSaved] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);

  const handleSave = () => {
    setApiBaseUrl(baseUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const refresh = async () => {
    const list = await api.getModels();
    setModels(list);
  };

  const openAdd = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const openEdit = (model: ModelConfig) => {
    setEditingConfig(model);
    setDialogOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">设置</h1>
        <p className="text-sm text-slate-500 mb-8">配置后端地址与模型 API 密钥</p>

        <div className="space-y-6">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-slate-200">后端服务</h2>
            </div>
            <label className="block text-xs text-slate-500 mb-2">API 基础地址</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saved ? '已保存' : '保存'}
              </button>
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">模型配置</h2>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加模型
              </button>
            </div>

            {models.length === 0 ? (
              <div className="text-xs text-slate-500">
                暂无模型配置。点击“添加模型”配置 DeepSeek / 豆包 / 通义千问，或在后端 <code className="bg-slate-800 px-1 rounded">apps/server/.env</code> 中设置对应 API Key。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {models.map((model) => (
                  <div
                    key={`${model.provider}/${model.modelName}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-slate-200">
                        <span className="font-medium">{model.provider}</span>
                        <span className="text-slate-600">/</span>
                        <span>{model.modelName}</span>
                        {model.isDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-400 border border-sky-500/20">
                            默认
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <Key className="w-3 h-3" />
                        <span className={model.hasApiKey ? 'text-emerald-400' : 'text-rose-400'}>
                          {model.hasApiKey ? '已配置 API Key' : '未配置 API Key'}
                        </span>
                        {model.baseUrl && <span className="text-slate-600">· {model.baseUrl}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(model)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">数据存储</h2>
            </div>
            <p className="text-xs text-slate-500">
              当前使用嵌入式 SQL.js 数据库（<code className="bg-slate-800 px-1 rounded">biiig.sqlite</code>）。生产环境建议切换到 PostgreSQL。
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-slate-200">Agent 审批</h2>
            </div>
            <p className="text-xs text-slate-500">
              Agent 执行文件/终端操作前需要用户审批，可在对话面板选择 Agent / Builder 模式。
            </p>
          </section>
        </div>
      </div>

      <ModelConfigDialog
        open={dialogOpen}
        config={editingConfig}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
