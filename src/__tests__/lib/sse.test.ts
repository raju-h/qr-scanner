/** Tests for SSE broadcast manager. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sseManager } from "@/lib/sse";
import type { Scan } from "@/types";

/** Helper — create a mock ReadableStreamDefaultController with an enqueue spy. */
function createMockController(): ReadableStreamDefaultController & { enqueue: ReturnType<typeof vi.fn> } {
  return {
    enqueue: vi.fn(),
    close: vi.fn(),
    desiredSize: 1,
    error: vi.fn(),
  };
}

/** Reusable test scan fixture. */
const testScan: Scan = {
  id: "test-id-1",
  value: "https://example.com",
  type: "QR_CODE" as const satisfies Scan["type"],
  rawType: "QR_CODE",
  timestamp: "2024-12-25T10:30:00.000Z",
  deviceInfo: null,
  createdAt: "2024-12-25T10:30:00.000Z",
};

describe("SSE broadcast manager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Drain all clients so the singleton is clean for the next test
    vi.useRealTimers();
  });

  it("adds and removes clients", () => {
    const controller = createMockController();

    sseManager.addClient(controller);
    expect(sseManager.clientCount).toBe(1);

    sseManager.removeClient(controller);
    expect(sseManager.clientCount).toBe(0);
  });

  it("broadcasts scan data to all connected clients", () => {
    const c1 = createMockController();
    const c2 = createMockController();
    const c3 = createMockController();

    sseManager.addClient(c1);
    sseManager.addClient(c2);
    sseManager.addClient(c3);

    sseManager.broadcast(testScan);

    const expected = `event: scan\ndata: ${JSON.stringify(testScan)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(expected);

    // Each controller should have received the same encoded bytes
    expect(c1.enqueue).toHaveBeenCalledWith(encoded);
    expect(c2.enqueue).toHaveBeenCalledWith(encoded);
    expect(c3.enqueue).toHaveBeenCalledWith(encoded);

    // Clean up
    sseManager.removeClient(c1);
    sseManager.removeClient(c2);
    sseManager.removeClient(c3);
  });

  it("removes clients that throw on enqueue (disconnected)", () => {
    const healthy = createMockController();
    const broken = createMockController();
    broken.enqueue.mockImplementation(() => {
      throw new Error("Stream closed");
    });

    sseManager.addClient(healthy);
    sseManager.addClient(broken);
    expect(sseManager.clientCount).toBe(2);

    sseManager.broadcast(testScan);

    // Broken controller should have been auto-removed
    expect(sseManager.clientCount).toBe(1);
    expect(healthy.enqueue).toHaveBeenCalled();

    sseManager.removeClient(healthy);
  });

  it("sends keep-alive comments", () => {
    const controller = createMockController();
    sseManager.addClient(controller);

    sseManager.sendKeepAlive();

    const encoder = new TextEncoder();
    const expected = encoder.encode(": keep-alive\n\n");
    expect(controller.enqueue).toHaveBeenCalledWith(expected);

    sseManager.removeClient(controller);
  });
});
