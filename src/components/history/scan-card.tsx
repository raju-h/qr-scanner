"use client";

/**
 * Scan card — displays a single scan with decoded value, type badge, relative
 * timestamp, copy-to-clipboard action, and expandable device info.
 */

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ScanWithMeta } from "@/hooks/use-scans";

interface ScanCardProps {
  scan: ScanWithMeta;
}

/** Maximum displayed value length before truncating with ellipsis. */
const MAX_VALUE_LENGTH = 80;

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function ScanCard({ scan }: ScanCardProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [relativeTime, setRelativeTime] = useState(() =>
    formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true }),
  );

  // Refresh the relative timestamp every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(
        formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true }),
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, [scan.timestamp]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(scan.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Clipboard API not available — fail silently
    }
  }

  const truncatedValue =
    scan.value.length > MAX_VALUE_LENGTH
      ? scan.value.slice(0, MAX_VALUE_LENGTH) + "…"
      : scan.value;

  const info = scan.deviceInfo;

  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900/60 p-4 backdrop-blur-sm transition-all ${
        scan.isNew ? "animate-slide-up" : ""
      }`}
    >
      {/* Top row — badge + timestamp */}
      <div className="flex items-center justify-between">
        <Badge type={scan.type} />
        <time className="text-xs text-gray-500" dateTime={scan.timestamp}>
          {relativeTime}
        </time>
      </div>

      {/* Value — tappable link if URL, otherwise plain text */}
      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {isUrl(scan.value) ? (
            <a
              href={scan.value}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-blue-400 underline underline-offset-2 hover:text-blue-300"
              title={scan.value}
            >
              {truncatedValue}
            </a>
          ) : (
            <p
              className="break-all text-sm font-medium text-gray-200"
              title={scan.value}
            >
              {truncatedValue}
            </p>
          )}
        </div>

        {/* Copy button — min 44px touch target for mobile */}
        <button
          onClick={handleCopy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label={copied ? "Copied" : "Copy value"}
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Expandable device info — collapsed by default */}
      {info && (info.browser || info.os) && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            aria-expanded={expanded}
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Device info
          </button>
          {expanded && (
            <div className="mt-1.5 rounded-lg bg-gray-800/50 px-3 py-2 text-xs text-gray-400">
              {info.browser && <p>Browser: {info.browser}</p>}
              {info.os && <p>OS: {info.os}</p>}
              {info.screenWidth && info.screenHeight && (
                <p>Screen: {info.screenWidth}×{info.screenHeight}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
