import { join } from 'node:path';
import { homedir } from 'node:os';

export interface AgentConfig {
  name: string;
  configPath: string;
}

export const MCP_SERVER_KEY = 'pro-ui-feedbacks';

export const MCP_ENTRY = {
  command: 'npx',
  args: ['pro-ui-feedbacks-mcp'],
};

/**
 * Get agent config paths. Called at runtime so
 * homedir() and cwd() resolve to current values.
 */
export function getAgentConfigs(): AgentConfig[] {
  const home = homedir();
  const cwd = process.cwd();
  return [
    { name: 'Claude Code', configPath: join(home, '.claude', 'mcp.json') },
    { name: 'Cursor', configPath: join(cwd, '.cursor', 'mcp.json') },
    { name: 'VS Code / Copilot', configPath: join(cwd, '.vscode', 'mcp.json') },
    { name: 'Windsurf', configPath: join(cwd, '.codeium', 'windsurf', 'mcp_config.json') },
  ];
}
