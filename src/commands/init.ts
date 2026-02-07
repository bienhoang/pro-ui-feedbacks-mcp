import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

interface AgentConfig {
  name: string;
  configPath: string;
}

const MCP_ENTRY = {
  'pro-ui-feedbacks': {
    command: 'npx',
    args: ['pro-ui-feedbacks-mcp'],
  },
};

function getAgentConfigs(): AgentConfig[] {
  const home = homedir();
  const cwd = process.cwd();

  return [
    { name: 'Claude Code', configPath: join(home, '.claude', 'mcp.json') },
    { name: 'Cursor', configPath: join(cwd, '.cursor', 'mcp.json') },
    { name: 'VS Code / Copilot', configPath: join(cwd, '.vscode', 'mcp.json') },
    {
      name: 'Windsurf',
      configPath: join(cwd, '.codeium', 'windsurf', 'mcp_config.json'),
    },
  ];
}

/**
 * Auto-detect AI agents and configure MCP server entry.
 */
export async function runInit(): Promise<void> {
  console.error('pro-ui-feedbacks-mcp init\n');
  const agents = getAgentConfigs();
  let configured = 0;

  for (const agent of agents) {
    const dir = dirname(agent.configPath);
    const dirExists = existsSync(dir);

    if (!dirExists) {
      console.error(`  [ ] ${agent.name} — config dir not found, skipping`);
      continue;
    }

    try {
      // Read existing config or start fresh
      let config: Record<string, unknown> = {};
      if (existsSync(agent.configPath)) {
        config = JSON.parse(readFileSync(agent.configPath, 'utf-8'));
      }

      // Merge MCP entry
      const mcpServers =
        (config.mcpServers as Record<string, unknown>) ?? {};
      if (mcpServers['pro-ui-feedbacks']) {
        console.error(`  [✓] ${agent.name} — already configured`);
        configured++;
        continue;
      }

      mcpServers['pro-ui-feedbacks'] = MCP_ENTRY['pro-ui-feedbacks'];
      config.mcpServers = mcpServers;

      // Ensure directory exists and write
      mkdirSync(dir, { recursive: true });
      writeFileSync(agent.configPath, JSON.stringify(config, null, 2) + '\n');
      console.error(`  [+] ${agent.name} — configured at ${agent.configPath}`);
      configured++;
    } catch (err) {
      console.error(`  [!] ${agent.name} — error: ${err}`);
    }
  }

  console.error(`\nDone. ${configured} agent(s) configured.`);
  if (configured === 0) {
    console.error(
      'No agents detected. You can manually add to your agent config:\n' +
        JSON.stringify({ mcpServers: MCP_ENTRY }, null, 2)
    );
  }
}
