import { getTool, type Tool } from '@omnitool/tools-registry';

export function requireTool(id: string): Tool {
  const tool = getTool(id);
  if (!tool) throw new Error(`Tool "${id}" is missing from the registry`);
  return tool;
}
