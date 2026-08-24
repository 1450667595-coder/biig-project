import { McpClient, McpTool, McpResource, McpTransport } from './types';

export class SimpleMcpClient implements McpClient {
  private transport?: McpTransport;
  private requestId = 0;
  private pending = new Map<number, { resolve: Function; reject: Function }>();

  async connect(transport: McpTransport): Promise<void> {
    this.transport = transport;
    transport.onMessage((message) => this.handleMessage(message));
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'biiig-mcp-client', version: '0.1.0' },
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.sendRequest('tools/list', {});
    return result.tools || [];
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  async listResources(): Promise<McpResource[]> {
    const result = await this.sendRequest('resources/list', {});
    return result.resources || [];
  }

  async readResource(uri: string): Promise<any> {
    return this.sendRequest('resources/read', { uri });
  }

  async disconnect(): Promise<void> {
    await this.transport?.close();
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pending.set(id, { resolve, reject });
      this.transport?.send({ jsonrpc: '2.0', id, method, params }).catch(reject);
    });
  }

  private handleMessage(message: any) {
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id)!;
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  }
}
