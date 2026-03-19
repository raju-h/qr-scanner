/** Tests for useScans hook — initial fetch, SSE, pagination, backoff. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useScans } from "@/hooks/use-scans";

// --- Mock EventSource ---

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, ((event: { data: string }) => void)[]> = {};
  closeSpy = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: (event: { data: string }) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(cb);
  }

  close(): void {
    this.closeSpy();
  }

  /** Test helper — fire a named event with data. */
  emit(event: string, data: string): void {
    for (const cb of this.listeners[event] ?? []) {
      cb({ data });
    }
  }

  /** Test helper — fire the error handler. */
  triggerError(): void {
    for (const cb of this.listeners["error"] ?? []) {
      (cb as () => void)();
    }
  }
}

// --- Fake API responses ---

function fakeScan(id: string, value = "https://example.com") {
  return {
    id,
    value,
    type: "QR_CODE",
    rawType: "QR_CODE",
    timestamp: "2024-12-25T10:30:00.000Z",
    deviceInfo: null,
    createdAt: "2024-12-25T10:30:00.000Z",
  };
}

function fakePageResponse(
  scans: ReturnType<typeof fakeScan>[],
  hasMore: boolean,
  nextCursor: string | null = null,
) {
  return { scans, hasMore, nextCursor };
}

describe("useScans", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it("fetches initial scans on mount", async () => {
    const page = fakePageResponse([fakeScan("s1"), fakeScan("s2")], false);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(page),
    });

    const { result } = renderHook(() => useScans());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.scans).toHaveLength(2);
      expect(result.current.scans[0]!.id).toBe("s1");
    });
  });

  it("subscribes to SSE on mount", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePageResponse([], false)),
    });

    renderHook(() => useScans());

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0]!.url).toBe("/api/scans/stream");
    });
  });

  it("prepends new scans from SSE events", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePageResponse([fakeScan("s1")], false)),
    });

    const { result } = renderHook(() => useScans());

    await waitFor(() => expect(result.current.scans).toHaveLength(1));

    // Simulate a new scan arriving via SSE
    const es = MockEventSource.instances[0]!;
    act(() => {
      es.emit("scan", JSON.stringify(fakeScan("s-new", "https://new.com")));
    });

    expect(result.current.scans).toHaveLength(2);
    expect(result.current.scans[0]!.id).toBe("s-new");
    expect(result.current.scans[0]!.isNew).toBe(true);
  });

  it("closes EventSource on unmount", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePageResponse([], false)),
    });

    const { unmount } = renderHook(() => useScans());

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    const es = MockEventSource.instances[0]!;
    unmount();

    expect(es.closeSpy).toHaveBeenCalled();
  });

  it("retries with exponential backoff on SSE error", async () => {
    // This test requires fake timers to control backoff delays
    vi.useFakeTimers();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePageResponse([], false)),
    });

    renderHook(() => useScans());

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(MockEventSource.instances).toHaveLength(1);

    // Trigger an error on the first EventSource
    act(() => {
      MockEventSource.instances[0]!.triggerError();
    });

    // After 1s backoff, a new EventSource should be created
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
    expect(MockEventSource.instances).toHaveLength(2);

    // Trigger error again — backoff doubles to 2s
    act(() => {
      MockEventSource.instances[1]!.triggerError();
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    // Should NOT have reconnected yet (only 1.5s of 2s)
    expect(MockEventSource.instances).toHaveLength(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    // Now 2.1s elapsed — should reconnect
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it("refetches when filter params change", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePageResponse([], false)),
    });
    global.fetch = mockFetch;

    const { rerender } = renderHook(
      ({ search }: { search?: string }) => useScans({ search }),
      { initialProps: { search: undefined as string | undefined } },
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Change the search filter
    rerender({ search: "example" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const secondCallUrl = mockFetch.mock.calls[1]![0] as string;
      expect(secondCallUrl).toContain("search=example");
    });
  });
});
