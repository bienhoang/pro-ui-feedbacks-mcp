#!/usr/bin/env node
import { startServer } from './index.js';
import { runInit } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';

const args = process.argv.slice(2);
const command = args[0];

function getPort(): number {
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const port = parseInt(args[portIdx + 1], 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`Invalid port: ${args[portIdx + 1]}. Must be 1-65535.`);
      process.exit(1);
    }
    return port;
  }
  return 4747;
}

async function main() {
  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'doctor':
      await runDoctor();
      break;
    case 'server':
    default:
      // Default: start MCP + HTTP servers
      await startServer({
        port: getPort(),
        mcpOnly: args.includes('--mcp-only'),
      });
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
