/**
 * Bridge two MCP transports: local (stdio) ↔ remote (HTTP/SSE).
 *
 * Key difference from mcp-remote: we never close the local transport
 * when the remote drops. ReconnectingTransport handles reconnection
 * while the stdio pipe to Claude Code stays alive.
 */

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

export function bridgeTransports(local: Transport, remote: Transport): void {
  local.onmessage = async (message: JSONRPCMessage) => {
    try {
      await remote.send(message);
    } catch (error) {
      logger.error(`Failed to forward message to remote: ${error}`);
    }
  };

  remote.onmessage = async (message: JSONRPCMessage) => {
    try {
      await local.send(message);
    } catch (error) {
      logger.error(`Failed to forward message to local: ${error}`);
    }
  };

  // Only propagate remote errors as logs, not as fatal events
  remote.onerror = (error: Error) => {
    logger.warn(`Remote transport error: ${error.message}`);
  };

  // If local stdio closes, everything should shut down
  local.onclose = () => {
    logger.info("Local transport closed, shutting down");
    void remote.close();
  };

  // Remote close is handled by ReconnectingTransport — do NOT close local
  remote.onclose = () => {
    logger.debug("Remote transport closed (reconnection will handle)");
  };
}
