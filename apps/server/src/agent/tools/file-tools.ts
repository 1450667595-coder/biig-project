import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool, ToolContext, ToolResult } from './tool.interface';

function resolveWorkspacePath(inputPath: string, workspacePath: string): string {
  const normalized = inputPath.replace(/^~\//, '').replace(/^\//, '');
  return path.resolve(workspacePath, normalized);
}

function isWithinWorkspace(targetPath: string, workspacePath: string): boolean {
  const resolvedWorkspace = path.resolve(workspacePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedWorkspace);
}

export class ReadFileTool implements Tool {
  readonly name = 'read_file';
  readonly definition = {
    name: 'read_file',
    description: 'Read the contents of a file within the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
      },
      required: ['path'],
    },
  };

  async execute(args: { path: string }, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveWorkspacePath(args.path, context.workspacePath);
    if (!isWithinWorkspace(filePath, context.workspacePath)) {
      return { success: false, output: '', error: 'Path outside workspace' };
    }
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, output: content };
    } catch (err: any) {
      return { success: false, output: '', error: err.message };
    }
  }
}

export class WriteFileTool implements Tool {
  readonly name = 'write_file';
  readonly definition = {
    name: 'write_file',
    description: 'Write content to a file within the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  };

  async execute(args: { path: string; content: string }, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveWorkspacePath(args.path, context.workspacePath);
    if (!isWithinWorkspace(filePath, context.workspacePath)) {
      return { success: false, output: '', error: 'Path outside workspace' };
    }
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, args.content, 'utf-8');
      return { success: true, output: `Wrote ${filePath}` };
    } catch (err: any) {
      return { success: false, output: '', error: err.message };
    }
  }
}

export class MultiEditTool implements Tool {
  readonly name = 'multi_edit';
  readonly definition = {
    name: 'multi_edit',
    description: 'Apply multiple search-and-replace edits to files within the workspace',
    parameters: {
      type: 'object',
      properties: {
        edits: {
          type: 'array',
          description: 'Edits to apply',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path to the file' },
              search: { type: 'string', description: 'Text to search for' },
              replace: { type: 'string', description: 'Replacement text' },
            },
            required: ['path', 'search', 'replace'],
          },
        },
      },
      required: ['edits'],
    },
  };

  async execute(args: { edits: Array<{ path: string; search: string; replace: string }> }, context: ToolContext): Promise<ToolResult> {
    if (!Array.isArray(args.edits) || args.edits.length === 0) {
      return { success: false, output: '', error: 'edits must be a non-empty array' };
    }

    const results: string[] = [];
    for (const edit of args.edits) {
      const filePath = resolveWorkspacePath(edit.path, context.workspacePath);
      if (!isWithinWorkspace(filePath, context.workspacePath)) {
        results.push(`${edit.path}: Path outside workspace`);
        continue;
      }

      try {
        const original = await fs.readFile(filePath, 'utf-8');
        if (!original.includes(edit.search)) {
          results.push(`${edit.path}: search text not found`);
          continue;
        }
        const modified = original.replace(edit.search, edit.replace);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, modified, 'utf-8');
        results.push(`${edit.path}: OK`);
      } catch (err: any) {
        results.push(`${edit.path}: ${err.message}`);
      }
    }

    const failed = results.filter((r) => !r.endsWith(': OK'));
    if (failed.length > 0) {
      return { success: false, output: results.join('\n'), error: failed.join('; ') };
    }
    return { success: true, output: results.join('\n') };
  }
}

export class ListDirTool implements Tool {
  readonly name = 'list_dir';
  readonly definition = {
    name: 'list_dir',
    description: 'List files and directories within the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative directory path (default: workspace root)' },
      },
    },
  };

  async execute(args: { path?: string }, context: ToolContext): Promise<ToolResult> {
    const dirPath = resolveWorkspacePath(args.path || '.', context.workspacePath);
    if (!isWithinWorkspace(dirPath, context.workspacePath)) {
      return { success: false, output: '', error: 'Path outside workspace' };
    }
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const lines = entries.map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`);
      return { success: true, output: lines.join('\n') };
    } catch (err: any) {
      return { success: false, output: '', error: err.message };
    }
  }
}
