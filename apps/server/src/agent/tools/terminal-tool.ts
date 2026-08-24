import { spawn } from 'child_process';
import { Tool, ToolContext, ToolResult } from './tool.interface';

const BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=/dev/zero',
  ':(){ :|:& };:',
  'powershell -e',
  'curl .*\\|.*bash',
];

const ALLOWED_COMMANDS = [
  'npm',
  'pnpm',
  'yarn',
  'node',
  'npx',
  'git',
  'mkdir',
  'touch',
  'cp',
  'mv',
  'ls',
  'cat',
  'echo',
  'grep',
  'find',
  'python',
  'python3',
  'pip',
  'tsc',
  'vite',
  'next',
  'jest',
  'eslint',
  'prettier',
];

export class ExecuteCommandTool implements Tool {
  readonly name = 'execute_command';
  readonly definition = {
    name: 'execute_command',
    description: 'Execute a terminal command within the workspace (sandboxed)',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default 60000)' },
      },
      required: ['command'],
    },
  };

  async execute(args: { command: string; timeout?: number }, context: ToolContext): Promise<ToolResult> {
    const command = args.command.trim();

    for (const blocked of BLOCKED_COMMANDS) {
      if (command.includes(blocked)) {
        return { success: false, output: '', error: `Command blocked for safety: ${blocked}` };
      }
    }

    const baseCommand = command.split(' ')[0];
    if (!ALLOWED_COMMANDS.includes(baseCommand)) {
      return {
        success: false,
        output: '',
        error: `Command '${baseCommand}' is not in the allowed whitelist. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
      };
    }

    return new Promise((resolve) => {
      const child = spawn(command, {
        cwd: context.workspacePath,
        shell: true,
        timeout: args.timeout || 60000,
        env: {
          ...process.env,
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        context.onOutput?.(chunk);
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        context.onOutput?.(chunk);
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout || stderr,
          error: code !== 0 ? `Exit code ${code}. ${stderr}` : undefined,
        });
      });

      child.on('error', (err) => {
        resolve({ success: false, output: '', error: err.message });
      });
    });
  }
}
