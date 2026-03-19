/** Tests for GET /api/scans/stream SSE endpoint. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted lets us define mock functions that are available when vi.mock runs
const { mockAddClient, mockRemoveClient } = vi.hoisted(() => ({
  mockAddClient: vi.fn(),
  mockRemoveClient: vi.fn(),
}));

vi.mock("@/lib/sse", () => ({
  sseManager: {
    addClient: mockAddClient,
    removeClient: mockRemoveClient,
    broadcast: vi.fn(),
  },
}));

import { GET } from "@/app/api/scans/stream/route";

describe("GET /api/scans/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns text/event-stream content type", async () => {
    const response = await GET();

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns Cache-Control no-cache header", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  });

  it("returns Connection keep-alive header", async () => {
    const response = await GET();

    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("registers a client with the SSE manager on connect", async () => {
    const response = await GET();

    // Reading from the stream triggers the start() callback which calls addClient
    const reader = response.body!.getReader();

    // Allow microtasks to settle so the ReadableStream start() fires
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddClient).toHaveBeenCalledTimes(1);

    reader.releaseLock();
  });

  it("removes client from SSE manager on cancel", async () => {
    const response = await GET();
    const reader = response.body!.getReader();

    // Let start() fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Cancel the stream — simulates browser closing the connection
    await reader.cancel();

    expect(mockRemoveClient).toHaveBeenCalledTimes(1);
  });
});
