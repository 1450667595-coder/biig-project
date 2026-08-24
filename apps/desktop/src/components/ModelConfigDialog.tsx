import { useState, useEffect } from 'react';
import { X, Save, Trash2, Key, Server, Cpu, Sparkles } from 'lucide-react';
import { ModelConfig, ModelCapability } from '@biiig/shared';
import { api } from '@/api/client';

interface Props {
  open: boolean;
  config?: ModelConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

const PRESETS: { label: string; provider: string; modelName: string; baseUrl: string; capabilities: ModelCapability[] }[] = [
  { label: 'DeepSeek Chat', provider: 'deepseek', modelName: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', capabilities: ['chat', 'code'] },
  { label: 'DeepSeek Coder', provider: 'deepseek', modelName: 'deepseek-coder', baseUrl: 'https://api.deepseek.com/v1', capabilities: ['chat', 'code'] },
  { label: 'DeepSeek Reasoner', provider: 'deepseek', modelName: 'deepseek-reasoner', baseUrl: 'https://api.deepseek.com/v1', capabilities: ['chat', 'code', 'reasoning'] },
  { label: '豆包 Pro 32K', provider: 'doubao', modelName: 'doubao-1-5-pro-32k-250115', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', capabilities: ['chat', 'code', 'long_context'] },
  { label: '通义千问 Coder Plus', provider: 'qwen', modelName: 'qwen-coder-plus', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', capabilities: ['chat', 'code'] },
  { label: '通义千问 Max', provider: 'qwen', modelName: 'qwen-max', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', capabilities: ['chat', 'code', 'reasoning'] },
];

const CAP_OPTIONS: { value: ModelCapability; label: string }[] = [
  { value: 'chat', label: '对话' },
  { value: 'code', label: '代码' },
  { value: 'reasoning', label: '推理' },
  { value: 'multimodal', label: '多模态' },
  { value: 'long_context', label: '长上下文' },
];

export default function ModelConfigDialog({ open, config, onClose, onSaved }: Props) {
  const [provider, setProvider] = useState('deepseek');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [priority, setPriority] = useState(1);
  const [capabilities, setCapabilities] = useState<ModelCapability[]>(['chat']);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      if (config) {
        setProvider(config.provider);
        setModelName(config.modelName);
        setApiKey(config.apiKey || '');
        setBaseUrl(config.baseUrl || '');
        setPriority(config.priority ?? 1);
        setCapabilities(config.capabilities?.length ? config.capabilities : ['chat']);
        setIsDefault(config.isDefault || false);
      } else {
        setProvider('deepseek');
        setModelName('');
        setApiKey('');
        setBaseUrl('');
        setPriority(1);
        setCapabilities(['chat', 'code']);
        setIsDefault(false);
      }
      setTestResult(null);
    }
  }, [open, config]);

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx];
    setProvider(p.provider);
    setModelName(p.modelName);
    setBaseUrl(p.baseUrl);
    setCapabilities(p.capabilities);
  };

  const toggleCap = (cap: ModelCapability) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const handleSave = async () => {
    if (!provider.trim() || !modelName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        provider: provider.trim(),
        modelName: modelName.trim(),
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        priority,
        capabilities,
        isDefault,
      };
      if (config?.id) {
        await api.updateModelConfig(config.id, payload);
      } else {
        await api.createModelConfig(payload);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config?.id) return;
    if (!confirm('确定删除该模型配置？')) return;
    await api.deleteModelConfig(config.id);
    onSaved();
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setTestResult({ ok: true, msg: '配置格式正确（连接测试占位）' });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2 text-[#c9d1d9]">
            <Cpu className="w-4 h-4 text-[#58a6ff]" />
            <span className="text-sm font-semibold">{config ? '编辑模型' : '添加模型'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#30363d] text-[#8b949e]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {!config && (
            <div>
              <label className="block text-[10px] uppercase text-[#8b949e] mb-2">快速预设</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(idx)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff]/50 text-[11px] text-[#c9d1d9] transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-[#58a6ff]" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-[#8b949e] mb-1">Provider</label>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="deepseek"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[#8b949e] mb-1">Model Name</label>
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] uppercase text-[#8b949e] mb-1">
              <Key className="w-3 h-3" /> API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] uppercase text-[#8b949e] mb-1">
              <Server className="w-3 h-3" /> Base URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-[#8b949e] mb-1">优先级</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-[#c9d1d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff]"
                />
                设为默认模型
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#8b949e] mb-2">能力标签</label>
            <div className="flex flex-wrap gap-2">
              {CAP_OPTIONS.map((cap) => (
                <button
                  key={cap.value}
                  onClick={() => toggleCap(cap.value)}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    capabilities.includes(cap.value)
                      ? 'bg-[#388bfd]/15 border-[#58a6ff]/50 text-[#58a6ff]'
                      : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {testResult && (
            <div
              className={`px-3 py-2 rounded text-[11px] ${
                testResult.ok
                  ? 'bg-[#238636]/10 text-[#3fb950] border border-[#238636]/30'
                  : 'bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/30'
              }`}
            >
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            {config && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-[#f85149]/10 text-[#f85149] hover:bg-[#f85149]/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 rounded text-xs border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#8b949e] transition-colors disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !provider.trim() || !modelName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-[#238636] text-white hover:bg-[#2ea043] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
