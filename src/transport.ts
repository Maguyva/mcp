/**
 * ReconnectingTransport wraps StreamableHTTPClientTransport with exponential
 * backoff reconnection and message queuing during reconnection windows.
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const BACKOFF_MULTIPLIER = 1.5;
const MAX_RETRIES = 10;
const INACTIVITY_TIMEOUT_MS = 60_000;

interface ReconnectingTransportOptions {
  serverUrl: string;
  headers: Record<string, string>;
}

export class ReconnectingTransport implements Transport {
  private inner: StreamableHTTPClientTransport | null = null;
  private readonly serverUrl: string;
  private readonly headers: Record<string, string>;
  private closed = false;
  private reconnecting = false;
  private messageQueue: JSONRPCMessage[] = [];
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  sessionId?: string;

  // Transport interface callbacks — set by the bridge
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(options: ReconnectingTransportOptions) {
    this.serverUrl = options.serverUrl;
    this.headers = options.headers;
  }

  async start(): Promise<void> {
    await this.connect();
    logger.info(`Connected to ${this.serverUrl}`);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error("Transport is closed");
    }

    if (this.reconnecting || !this.inner) {
      logger.debug("Queuing message during reconnection");
      this.messageQueue.push(message);
      if (!this.reconnecting && !this.inner) {
        // Retries were exhausted — start fresh reconnection cycle
        this.scheduleReconnect();
      }
      return;
    }

    try {
      await this.inner.send(message);
    } catch (error) {
      // Queue the message and trigger reconnection
      logger.warn(`Send failed, queuing message and reconnecting: ${error}`);
      this.messageQueue.push(message);
      this.scheduleReconnect();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.clearInactivityTimer();
    this.messageQueue = [];
    if (this.inner) {
      await this.inner.close();
      this.inner = null;
    }
    this.onclose?.();
  }

  private async connect(): Promise<void> {
    const url = new URL(this.serverUrl);
    const headers: Record<string, string> = { ...this.headers };

    this.inner = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
      sessionId: this.sessionId,
    });

    // Wire inner transport callbacks
    this.inner.onmessage = (message: JSONRPCMessage) => {
      this.resetInactivityTimer();
      this.onmessage?.(message);
    };

    this.inner.onerror = (error: Error) => {
      if (this.closed) return;
      logger.warn(`Transport error: ${error.message}`);
      this.scheduleReconnect();
    };

    this.inner.onclose = () => {
      if (this.closed) return;
      logger.warn("Transport closed unexpectedly");
      this.scheduleReconnect();
    };

    await this.inner.start();

    // Capture session ID for reconnection
    if (this.inner.sessionId) {
      this.sessionId = this.inner.sessionId;
    }

    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      if (this.closed || this.reconnecting) return;
      logger.warn(
        `No messages received for ${INACTIVITY_TIMEOUT_MS}ms, reconnecting`,
      );
      this.scheduleReconnect();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnecting) return;
    this.clearInactivityTimer();
    this.reconnecting = true;

    // Run reconnect loop without blocking
    void this.reconnectLoop();
  }

  private async reconnectLoop(): Promise<void> {
    let delay = INITIAL_DELAY_MS;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (this.closed) {
        this.reconnecting = false;
        return;
      }

      logger.info(
        `Reconnecting (attempt ${attempt}/${MAX_RETRIES}, delay ${delay}ms)`,
      );
      await sleep(delay);

      try {
        // Close old transport silently
        if (this.inner) {
          try {
            await this.inner.close();
          } catch {
            // Ignore close errors on stale transport
          }
          this.inner = null;
        }

        await this.connect();
        logger.info("Reconnected");

        // Drain queued messages
        this.reconnecting = false;
        await this.drainQueue();
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Server rejects stale session after deployment — start fresh
        if (msg.includes("404") || msg.includes("session")) {
          logger.info("Session rejected by server, clearing session ID");
          this.sessionId = undefined;
        }
        logger.warn(`Reconnect attempt ${attempt} failed: ${msg}`);
        delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      }
    }

    // Exhausted retries
    this.reconnecting = false;
    const err = new Error(`Failed to reconnect after ${MAX_RETRIES} attempts`);
    logger.error(err.message);
    this.onerror?.(err);
  }

  private async drainQueue(): Promise<void> {
    const queued = [...this.messageQueue];
    this.messageQueue = [];

    if (queued.length > 0) {
      logger.info(`Draining ${queued.length} queued messages`);
    }

    for (const message of queued) {
      try {
        await this.send(message);
      } catch (error) {
        logger.error(`Failed to send queued message: ${error}`);
        // Re-queue and let reconnection handle it
        this.messageQueue.push(message);
        break;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
