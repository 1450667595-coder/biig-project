export interface AgentAction {
  thought?: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
  finalAnswer?: string;
  actions?: AgentAction[];
}

function normalizeAction(parsed: Record<string, any>): AgentAction {
  if (Array.isArray(parsed.actions)) {
    return {
      thought: parsed.thought || parsed.reasoning,
      actions: parsed.actions.map((a: any) => normalizeAction(a)),
    };
  }
  return {
    thought: parsed.thought || parsed.reasoning,
    tool: parsed.tool,
    toolInput: parsed.toolInput || parsed.parameters,
    finalAnswer: parsed.finalAnswer || parsed.answer || parsed.final,
  };
}

export function parseAction(response: string): AgentAction {
  const candidates: string[] = [];

  const trimmed = response.trim();
  candidates.push(trimmed);

  const jsonMatch = trimmed.match(/\{[\s\S]*?\}/);
  if (jsonMatch) candidates.push(jsonMatch[0]);

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) candidates.push(fenceMatch[1].trim());

  const lastFence = trimmed.match(/```[\s\S]*```\s*([\s\S]*)/);
  if (lastFence) candidates.push(lastFence[1].trim());

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return normalizeAction(parsed);
    } catch {
      continue;
    }
  }

  return { thought: response, finalAnswer: response };
}
