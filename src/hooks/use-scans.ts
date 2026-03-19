"use client";
/**
 * Scans data hook — fetches paginated scan history and subscribes to SSE for real-time updates.
 * Handles cursor pagination, filter changes, and reconnection with exponential backoff.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scan, ScanType, PaginatedScans } from "@/types";

/** Scan with a transient flag for entry animation in the list. */
export interface ScanWithMeta extends Scan {
  isNew?: boolean;
}

/** SSE connection health — surfaced in the UI as a status dot. */
export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface UseScansOptions {
  search?: string;
  type?: ScanType | undefined;
}

interface UseScansReturn {
  scans: ScanWithMeta[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  error: string | null;
  /** Live SSE connection health for the status indicator. */
  connectionStatus: ConnectionStatus;
  /** Re-fetch the first page (used by pull-to-refresh). */
  refresh: () => void;
}

/** Maximum back-off delay for SSE reconnection (30 seconds). */
const MAX_BACKOFF_MS = 30_000;

/**
 * Build the query string for /api/scans.
 */
function buildQueryString(params: {
  cursor?: string | null;
  limit?: number;
  search?: string;
  type?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.type) qs.set("type", params.type);
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export function useScans(options?: UseScansOptions): UseScansReturn {
  const search = options?.search;
  const type = options?.type;

  const [scans, setScans] = useState<ScanWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [refreshKey, setRefreshKey] = useState(0);

  const cursorRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1_000);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Initial fetch + refetch on filter change or manual refresh ---

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    cursorRef.current = null;

    async function fetchInitial(): Promise<void> {
      try {
        const qs = buildQueryString({ limit: 20, search, type });
        const res = await fetch(`/api/scans${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: PaginatedScans = await res.json();
        if (cancelled) return;

        setScans(data.scans);
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch scans");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchInitial();
    return () => { cancelled = true; };
  }, [search, type, refreshKey]);

  // --- SSE subscription ---

  useEffect(() => {
    function connect(): void {
      const es = new EventSource("/api/scans/stream");
      eventSourceRef.current = es;

      es.addEventListener("scan", (event: MessageEvent) => {
        try {
          const scan: Scan = JSON.parse(event.data);
          setScans((prev) => [{ ...scan, isNew: true }, ...prev]);

          // Clear the isNew flag after the entry animation finishes so it
          // doesn't replay if the list re-renders for another reason.
          setTimeout(() => {
            setScans((prev) =>
              prev.map((s) => (s.id === scan.id ? { ...s, isNew: false } : s)),
            );
          }, 500);
        } catch {
          // Malformed SSE data — ignore
        }
      });

      es.addEventListener("open", () => {
        backoffRef.current = 1_000;
        setConnectionStatus("connected");
      });

      es.addEventListener("error", () => {
        es.close();
        eventSourceRef.current = null;
        setConnectionStatus("reconnecting");

        // Exponential backoff: 1s → 2s → 4s → … → 30s max
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);

        retryTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      });
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnectionStatus("disconnected");
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  // --- Pagination ---

  const fetchMore = useCallback((): void => {
    if (isLoadingMore || !hasMore || !cursorRef.current) return;
    setIsLoadingMore(true);

    const qs = buildQueryString({
      cursor: cursorRef.current,
      limit: 20,
      search,
      type,
    });

    fetch(`/api/scans${qs}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PaginatedScans>;
      })
      .then((data) => {
        setScans((prev) => [...prev, ...data.scans]);
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load more");
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [isLoadingMore, hasMore, search, type]);

  const refresh = useCallback((): void => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { scans, isLoading, isLoadingMore, hasMore, fetchMore, error, connectionStatus, refresh };
}
