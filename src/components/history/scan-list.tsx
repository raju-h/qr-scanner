"use client";

/**
 * Scan list — renders infinite-scrolling list of ScanCards with loading states.
 * Uses IntersectionObserver on a sentinel element to trigger pagination.
 */

import { useEffect, useRef } from "react";
import { ScanCard } from "@/components/history/scan-card";
import { EmptyState } from "@/components/history/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScanWithMeta } from "@/hooks/use-scans";

interface ScanListProps {
  scans: ScanWithMeta[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ScanList({
  scans,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: ScanListProps): React.ReactElement {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Trigger pagination when the sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  // --- Skeleton loading state ---
  if (isLoading && scans.length === 0) {
    return (
      <div className="space-y-3" aria-label="Loading scans">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-800 bg-gray-900/60 p-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // --- Empty state ---
  if (!isLoading && scans.length === 0) {
    return <EmptyState />;
  }

  // --- Scan cards ---
  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <ScanCard key={scan.id} scan={scan} />
      ))}

      {/* Sentinel element for infinite scroll — observer fires when this enters the viewport */}
      {hasMore && (
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      )}

      {/* Loading spinner during pagination */}
      {isLoadingMore && (
        <div className="flex justify-center py-4" aria-label="Loading more scans">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
        </div>
      )}
    </div>
  );
}
