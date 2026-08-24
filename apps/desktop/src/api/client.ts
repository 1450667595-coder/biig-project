import { useAppStore } from '@/store/useAppStore';

const getBaseUrl = () => useAppStore.getState().apiBaseUrl;

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface Plugin {
  id: string;
  name: string;
  description?: string;
  entryCommand: string;
  envVars: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  getConversations: () => fetchJson('/conversations'),
  createConversation: (data: any) =>
    fetchJson('/conversations', { method: 'POST', body: JSON.stringify(data) }),
  getConversation: (id: string) => fetchJson(`/conversations/${id}`),
  updateConversation: (id: string, data: any) =>
    fetchJson(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteConversation: (id: string) =>
    fetchJson(`/conversations/${id}`, { method: 'DELETE' }),

  postMessageStream: (id: string, content: string, model?: string, mode?: string) =>
    fetch(`${getBaseUrl()}/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, model, mode }),
    }),

  getProjects: () => fetchJson('/projects'),
  createProject: (data: any) =>
    fetchJson('/projects', { method: 'POST', body: JSON.stringify(data) }),
  getProjectFiles: (id: string, path = '') =>
    fetchJson(`/projects/${id}/files?path=${encodeURIComponent(path)}`),
  getProjectFileContent: (id: string, path: string) =>
    fetchJson(`/projects/${id}/files/content?path=${encodeURIComponent(path)}`),
  saveProjectFileContent: (id: string, path: string, content: string) =>
    fetchJson(`/projects/${id}/files/content?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  getModels: () => fetchJson('/models'),
  createModelConfig: (data: any) =>
    fetchJson('/models/config', { method: 'POST', body: JSON.stringify(data) }),
  updateModelConfig: (id: string, data: any) =>
    fetchJson(`/models/config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModelConfig: (id: string) =>
    fetchJson(`/models/config/${id}`, { method: 'DELETE' }),

  getTemplates: (category?: string) =>
    fetchJson(`/templates${category ? `?category=${category}` : ''}`),
  generateTemplate: (id: string, params: Record<string, string>, targetPath: string) =>
    fetchJson(`/templates/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify({ params, targetPath }),
    }),

  getPlugins: () => fetchJson('/plugins'),
  createPlugin: (data: Partial<Plugin>) =>
    fetchJson('/plugins', { method: 'POST', body: JSON.stringify(data) }),
  updatePlugin: (id: string, data: Partial<Plugin>) =>
    fetchJson(`/plugins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlugin: (id: string) => fetchJson(`/plugins/${id}`, { method: 'DELETE' }),
  executePlugin: (command: string, args?: string[], env?: Record<string, string>) =>
    fetchJson('/plugins/execute', {
      method: 'POST',
      body: JSON.stringify({ command, args, env }),
    }),

  createAgentTask: (data: any) =>
    fetchJson('/agent/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getAgentTask: (id: string) => fetchJson(`/agent/tasks/${id}`),
  executeAgentTask: (id: string) =>
    new EventSource(`${getBaseUrl()}/agent/tasks/${id}/execute`),
  approveAgentTask: (id: string) =>
    fetchJson(`/agent/tasks/${id}/approve`, { method: 'POST' }),
  rejectAgentTask: (id: string) =>
    fetchJson(`/agent/tasks/${id}/reject`, { method: 'POST' }),
  cancelAgentTask: (id: string) =>
    fetchJson(`/agent/tasks/${id}/cancel`, { method: 'POST' }),

  indexRepoWiki: (projectId: string) =>
    fetchJson(`/projects/${projectId}/wiki/index`, { method: 'POST' }),
  searchRepoWiki: (projectId: string, q: string) =>
    fetchJson(`/projects/${projectId}/wiki/search?q=${encodeURIComponent(q)}`),
};
