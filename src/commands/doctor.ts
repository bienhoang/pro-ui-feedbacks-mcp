import { existsSync, readFileSync } from 'node:fs';
import { getAgentConfigs, MCP_SERVER_KEY } from './agent-configs.js';

/**
 * Verify MCP server setup and configuration.
 */
export async function runDoctor(): Promise<void> {
  console.error('gosnap-mcp doctor\n');
  let issues = 0;

  // Check Node.js version
  const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVersion >= 18) {
    console.error(`  [✓] Node.js v${process.versions.node} (>=18 required)`);
  } else {
    console.error(`  [✗] Node.js v${process.versions.node} — v18+ required`);
    issues++;
  }

  // Check agent configs for MCP entry
  const agents = getAgentConfigs();
  let hasConfig = false;

  for (const { name, configPath } of agents) {
    if (!existsSync(configPath)) continue;

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config?.mcpServers?.[MCP_SERVER_KEY]) {
        console.error(`  [✓] ${name} — configured`);
        hasConfig = true;
      } else {
        console.error(`  [~] ${name} — config exists but no MCP entry. Run 'init'.`);
      }
    } catch {
      console.error(`  [!] ${name} — config file is invalid JSON`);
      issues++;
    }
  }

  if (!hasConfig) {
    console.error("  [✗] No agent configured. Run 'npx gosnap-mcp init'.");
    issues++;
  }

  console.error(
    issues === 0
      ? '\nAll checks passed.'
      : `\n${issues} issue(s) found. Fix them and run doctor again.`
  );
}
