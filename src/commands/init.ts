import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getAgentConfigs, MCP_SERVER_KEY, MCP_ENTRY } from './agent-configs.js';

/**
 * Auto-detect AI agents and configure MCP server entry.
 */
export async function runInit(): Promise<void> {
  console.error('gosnap-mcp init\n');
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
      let config: Record<string, unknown> = {};
      if (existsSync(agent.configPath)) {
        config = JSON.parse(readFileSync(agent.configPath, 'utf-8'));
      }

      const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
      if (mcpServers[MCP_SERVER_KEY]) {
        console.error(`  [✓] ${agent.name} — already configured`);
        configured++;
        continue;
      }

      mcpServers[MCP_SERVER_KEY] = MCP_ENTRY;
      config.mcpServers = mcpServers;

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
        JSON.stringify({ mcpServers: { [MCP_SERVER_KEY]: MCP_ENTRY } }, null, 2)
    );
  }
}
