/** Tests for ScanList component. */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScanList } from "@/components/history/scan-list";
import type { ScanWithMeta } from "@/hooks/use-scans";

function makeScan(id: string, overrides: Partial<ScanWithMeta> = {}): ScanWithMeta {
  return {
    id,
    value: `https://example.com/${id}`,
    type: "QR_CODE",
    rawType: "QR_CODE",
    timestamp: new Date().toISOString(),
    deviceInfo: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Mock IntersectionObserver for pagination tests
const mockIntersectionObserver = vi.fn();
let observerCallback: IntersectionObserverCallback | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  observerCallback = null;

  mockIntersectionObserver.mockImplementation((cb: IntersectionObserverCallback) => {
    observerCallback = cb;
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);
});

describe("ScanList", () => {
  it("renders skeleton loaders while fetching", () => {
    render(
      <ScanList
        scans={[]}
        isLoading={true}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );

    // Skeleton container should be present
    const loadingRegion = screen.getByLabelText("Loading scans");
    expect(loadingRegion).toBeTruthy();

    // Should render multiple skeleton placeholders (at least 3)
    const skeletons = loadingRegion.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders empty state when no scans", () => {
    render(
      <ScanList
        scans={[]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText("No scans yet")).toBeTruthy();
    expect(screen.getByText(/Point your camera/)).toBeTruthy();
  });

  it("renders scan cards for each scan", () => {
    const scans = [makeScan("s1"), makeScan("s2"), makeScan("s3"), makeScan("s4"), makeScan("s5")];
    render(
      <ScanList
        scans={scans}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );

    // Each scan card renders the value as text or link
    for (const scan of scans) {
      expect(screen.getByTitle(scan.value)).toBeTruthy();
    }
  });

  it("triggers pagination on scroll to bottom", () => {
    const onLoadMore = vi.fn();
    render(
      <ScanList
        scans={[makeScan("s1")]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );

    // The IntersectionObserver should have been created
    expect(mockIntersectionObserver).toHaveBeenCalled();

    // Simulate the sentinel entering the viewport
    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    }

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner during pagination", () => {
    render(
      <ScanList
        scans={[makeScan("s1")]}
        isLoading={false}
        isLoadingMore={true}
        hasMore={true}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Loading more scans")).toBeTruthy();
  });

  it("animates new scans into the list", () => {
    const newScan = makeScan("s-new", { isNew: true });
    const { container } = render(
      <ScanList
        scans={[newScan, makeScan("s-old")]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );

    // The new scan's card should have the slide-up animation class
    const animatedCards = container.querySelectorAll(".animate-slide-up");
    expect(animatedCards.length).toBe(1);
  });
});
