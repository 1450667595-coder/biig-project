export interface McpServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

export interface McpResource {
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
}

export interface McpTransport {
  send(message: any): Promise<void>;
  onMessage(callback: (message: any) => void): void;
  close(): Promise<void>;
}

export interface McpClient {
  connect(transport: McpTransport): Promise<void>;
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, any>): Promise<any>;
  listResources(): Promise<McpResource[]>;
  readResource(uri: string): Promise<any>;
  disconnect(): Promise<void>;
}
