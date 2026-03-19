/** SSE broadcast manager — manages connected clients and broadcasts scan events to all listeners. */

import type { Scan } from "@/types";

/** Encoder shared across all SSE formatting to avoid repeated allocations. */
const encoder = new TextEncoder();

class SSEManager {
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  /** Add a client controller to receive SSE events. */
  addClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller);
    this.ensureKeepAlive();
  }

  /** Remove a disconnected client controller. */
  removeClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller);

    // Stop the keep-alive interval when no clients remain to avoid a dangling timer
    if (this.clients.size === 0 && this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Broadcast a new scan event to every connected client.
   * Silently removes clients that have disconnected (enqueue throws).
   */
  broadcast(scan: Scan): void {
    const message = `event: scan\ndata: ${JSON.stringify(scan)}\n\n`;
    const encoded = encoder.encode(message);

    for (const client of this.clients) {
      try {
        client.enqueue(encoded);
      } catch {
        // Client disconnected — remove so we don't keep trying
        this.clients.delete(client);
      }
    }
  }

  /** Send a keep-alive SSE comment to prevent proxies and browsers from closing idle connections. */
  sendKeepAlive(): void {
    const comment = encoder.encode(": keep-alive\n\n");

    for (const client of this.clients) {
      try {
        client.enqueue(comment);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /** Get the number of currently connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Start the 30-second keep-alive interval if it isn't already running. */
  private ensureKeepAlive(): void {
    if (this.keepAliveInterval) return;

    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 30_000);
  }
}

/** Singleton — every API route shares this instance so broadcasts reach all listeners. */
export const sseManager = new SSEManager();
