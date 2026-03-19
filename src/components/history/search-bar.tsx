"use client";

/**
 * Search bar — filters scan history by value and type.
 * Text input is debounced (300ms) to avoid excessive refetches.
 */

import { useEffect, useRef, useState } from "react";
import type { ScanType } from "@/types";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onTypeFilter: (type: ScanType | undefined) => void;
}

export function SearchBar({ onSearch, onTypeFilter }: SearchBarProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search callback — 300ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  function handleTypeChange(value: string): void {
    setTypeFilter(value);
    onTypeFilter(value === "" ? undefined : (value as ScanType));
  }

  function handleClear(): void {
    setQuery("");
    setTypeFilter("");
    onSearch("");
    onTypeFilter(undefined);
  }

  const hasFilters = query !== "" || typeFilter !== "";

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-gray-950/80 px-4 pb-3 pt-3 backdrop-blur-md">
      <div className="flex gap-2">
        {/* Search input with icon */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scans…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Search scans"
          />
        </div>

        {/* Type filter dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Filter by type"
        >
          <option value="">All</option>
          <option value="QR_CODE">QR Code</option>
          <option value="EAN_13">EAN-13</option>
        </select>

        {/* Clear button — only visible when filters are active */}
        {hasFilters && (
          <button
            onClick={handleClear}
            className="flex items-center rounded-lg px-2 text-xs text-gray-400 hover:text-white"
            aria-label="Clear filters"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
