import { parseAction } from './agent-action.util';

describe('parseAction', () => {
  it('parses a tool action', () => {
    const response = JSON.stringify({
      thought: 'Read the file',
      tool: 'read_file',
      toolInput: { path: 'src/index.ts' },
    });
    const action = parseAction(response);
    expect(action.thought).toBe('Read the file');
    expect(action.tool).toBe('read_file');
    expect(action.toolInput).toEqual({ path: 'src/index.ts' });
  });

  it('parses a final answer', () => {
    const response = JSON.stringify({
      thought: 'Done',
      finalAnswer: 'Task completed successfully.',
    });
    const action = parseAction(response);
    expect(action.finalAnswer).toBe('Task completed successfully.');
    expect(action.tool).toBeUndefined();
  });

  it('extracts JSON from markdown fences', () => {
    const response = "```json\n{\"tool\":\"list_dir\",\"toolInput\":{\"path\":\".\"}}\n```";
    const action = parseAction(response);
    expect(action.tool).toBe('list_dir');
    expect(action.toolInput).toEqual({ path: '.' });
  });

  it('falls back to treating response as final answer if not JSON', () => {
    const response = 'This is a plain text response.';
    const action = parseAction(response);
    expect(action.finalAnswer).toBe(response);
    expect(action.tool).toBeUndefined();
  });

  it('parses a batch of actions', () => {
    const response = JSON.stringify({
      thought: 'Make multiple edits',
      actions: [
        { tool: 'read_file', toolInput: { path: 'src/a.ts' } },
        { tool: 'write_file', toolInput: { path: 'src/b.ts', content: 'export const b = 1;' } },
      ],
    });
    const action = parseAction(response);
    expect(action.thought).toBe('Make multiple edits');
    expect(action.actions).toHaveLength(2);
    expect(action.actions?.[0].tool).toBe('read_file');
    expect(action.actions?.[1].tool).toBe('write_file');
    expect(action.tool).toBeUndefined();
  });

  it('parses a multi_edit batch action', () => {
    const response = JSON.stringify({
      thought: 'Batch edits',
      actions: [
        {
          tool: 'multi_edit',
          toolInput: {
            edits: [{ path: 'src/a.ts', search: 'foo', replace: 'bar' }],
          },
        },
      ],
    });
    const action = parseAction(response);
    expect(action.actions).toHaveLength(1);
    expect(action.actions?.[0].tool).toBe('multi_edit');
  });
});
