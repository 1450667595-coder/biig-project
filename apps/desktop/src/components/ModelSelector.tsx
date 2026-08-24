import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Cpu, Settings2 } from 'lucide-react';
import { api } from '@/api/client';
import ModelConfigDialog from './ModelConfigDialog';

export default function ModelSelector() {
  const { models, selectedModel, setSelectedModel, setModels } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const refresh = async () => {
    const list = await api.getModels();
    setModels(list);
  };

  return (
    <>
      <div className="flex items-center gap-1 bg-[#0d1117] rounded-md px-2 py-1 border border-[#30363d]">
        <Cpu className="w-3 h-3 text-[#8b949e]" />
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-transparent text-[10px] outline-none text-[#c9d1d9] max-w-[140px]"
        >
          {models.length === 0 && <option value="deepseek/deepseek-chat">deepseek-chat</option>}
          {models.map((model) => (
            <option key={`${model.provider}/${model.modelName}`} value={`${model.provider}/${model.modelName}`}>
              {model.provider}/{model.modelName}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setEditingConfig(null);
            setDialogOpen(true);
          }}
          title="管理模型"
          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        >
          <Settings2 className="w-3 h-3" />
        </button>
      </div>
      <ModelConfigDialog
        open={dialogOpen}
        config={editingConfig}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
    </>
  );
}
