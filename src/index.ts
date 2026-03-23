/**
 * @maguyva/mcp — MCP bridge with automatic reconnection.
 *
 * Claude Code ←stdio→ this process ←HTTP/SSE→ Maguyva server
 *
 * The stdio pipe never breaks. Only the HTTP connection to the server
 * breaks during deploys, and ReconnectingTransport auto-reconnects.
 */

import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { logger, setLogLevel } from "./logger.js";
import { bridgeTransports } from "./proxy.js";
import { ReconnectingTransport } from "./transport.js";

function printHelp(): void {
  const require = createRequire(import.meta.url);
  const { version } = require("../package.json") as { version: string };

  process.stderr.write(
    `maguyva-mcp v${version}

MCP bridge for Maguyva code intelligence.
Claude Code <--stdio--> maguyva-mcp <--HTTP/SSE--> Maguyva server

Usage:
  maguyva-mcp [options]

Options:
  --api-key=KEY   Maguyva API key (or set MAGUYVA_API_KEY)
  --server=URL    Maguyva server URL (default: https://maguyva.tools/mcp)
  --debug         Enable debug logging
  --help          Show this help message
  --version       Show version
`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  if (process.argv.includes("--version")) {
    const require = createRequire(import.meta.url);
    const { version } = require("../package.json") as { version: string };
    process.stderr.write(`${version}\n`);
    process.exit(0);
  }

  if (process.argv.includes("--debug")) {
    setLogLevel("debug");
  }

  const config = loadConfig();
  logger.info(`Starting maguyva-mcp bridge to ${config.serverUrl}`);

  // Local: stdio transport (Claude Code connects here)
  const local = new StdioServerTransport();

  // Remote: reconnecting HTTP transport to Maguyva server
  const remote = new ReconnectingTransport({
    serverUrl: config.serverUrl,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json, text/event-stream",
    },
  });

  // Wire the two transports together
  bridgeTransports(local, remote);

  // Start both transports
  await local.start();
  await remote.start();

  logger.info("Bridge active");

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down");
    await remote.close();
    await local.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  logger.error(`Fatal: ${error}`);
  process.exit(1);
});
