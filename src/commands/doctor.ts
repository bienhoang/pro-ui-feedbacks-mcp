import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Verify MCP server setup and configuration.
 */
export async function runDoctor(): Promise<void> {
  console.error('pro-ui-feedbacks-mcp doctor\n');
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
  const home = homedir();
  const cwd = process.cwd();
  const configPaths = [
    { name: 'Claude Code', path: join(home, '.claude', 'mcp.json') },
    { name: 'Cursor', path: join(cwd, '.cursor', 'mcp.json') },
    { name: 'VS Code / Copilot', path: join(cwd, '.vscode', 'mcp.json') },
    {
      name: 'Windsurf',
      path: join(cwd, '.codeium', 'windsurf', 'mcp_config.json'),
    },
  ];

  let hasConfig = false;
  for (const { name, path } of configPaths) {
    if (!existsSync(path)) continue;

    try {
      const config = JSON.parse(readFileSync(path, 'utf-8'));
      if (config?.mcpServers?.['pro-ui-feedbacks']) {
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
    console.error("  [✗] No agent configured. Run 'npx pro-ui-feedbacks-mcp init'.");
    issues++;
  }

  // Summary
  console.error(
    issues === 0
      ? '\nAll checks passed.'
      : `\n${issues} issue(s) found. Fix them and run doctor again.`
  );
}
