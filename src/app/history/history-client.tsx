"use client";

/**
 * History client component — uses the useScans hook and composes
 * SearchBar + ScanList + connection status indicator.
 * Separated from page.tsx so the page can remain a server component for metadata.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useScans } from "@/hooks/use-scans";
import type { ConnectionStatus } from "@/hooks/use-scans";
import { ScanList } from "@/components/history/scan-list";
import { SearchBar } from "@/components/history/search-bar";
import type { ScanType } from "@/types";

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: "bg-green-400",
  reconnecting: "bg-yellow-400 animate-pulse",
  disconnected: "bg-red-400",
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: "Live",
  reconnecting: "Reconnecting…",
  disconnected: "Offline",
};

export function HistoryClient(): React.ReactElement {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ScanType | undefined>(undefined);

  const { scans, isLoading, isLoadingMore, hasMore, fetchMore, error, connectionStatus, refresh } =
    useScans({ search: search || undefined, type: typeFilter });

  const handleSearch = useCallback((query: string) => setSearch(query), []);
  const handleTypeFilter = useCallback(
    (type: ScanType | undefined) => setTypeFilter(type),
    [],
  );

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-20 pt-safe-top">
      {/* Header with back navigation, connection status, and refresh */}
      <div className="flex items-center gap-3 pb-2 pt-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Back to scanner"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-semibold text-white">Scan History</h1>

        {/* Connection status dot */}
        <div className="flex items-center gap-1.5" aria-label={`Connection: ${STATUS_LABELS[connectionStatus]}`}>
          <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[connectionStatus]}`} aria-hidden="true" />
          <span className="text-xs text-gray-500">{STATUS_LABELS[connectionStatus]}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
          aria-label="Refresh scans"
        >
          <svg className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Search + type filter */}
      <SearchBar onSearch={handleSearch} onTypeFilter={handleTypeFilter} />

      {/* Error banner */}
      {error && (
        <div className="my-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      {/* Scan list with infinite scroll */}
      <ScanList
        scans={scans}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={fetchMore}
      />
    </main>
  );
}
