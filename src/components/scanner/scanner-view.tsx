"use client";

/**
 * Main scanner component — renders full-viewport camera feed, scan overlay,
 * success feedback, manual entry fallback, and navigation to history.
 * Wires together useScanner, useDeviceInfo, and the POST /api/scans call.
 * Queues scans offline and retries when connectivity returns.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useScanner } from "@/hooks/use-scanner";
import { useDeviceInfo } from "@/hooks/use-device-info";
import { ScanOverlay } from "@/components/scanner/scan-overlay";
import { ScanFeedback } from "@/components/scanner/scan-feedback";
import { ManualEntry } from "@/components/scanner/manual-entry";
import type { ScanType, CreateScanRequest } from "@/types";

export function ScannerView(): React.ReactElement {
  const deviceInfo = useDeviceInfo();
  const [lastScanValue, setLastScanValue] = useState<string | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);

  // Offline scan queue — scans are queued when the network is down and flushed
  // automatically when connectivity returns.
  const offlineQueueRef = useRef<CreateScanRequest[]>([]);

  /** Flush any queued scans to the API. */
  const flushQueue = useCallback((): void => {
    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];

    for (const payload of queue) {
      fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Still offline — re-queue
        offlineQueueRef.current.push(payload);
      });
    }
  }, []);

  // Listen for the browser coming back online to flush the queue
  useEffect(() => {
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [flushQueue]);

  /** Send a decoded scan to the API — fires optimistically so the UI reacts instantly. */
  const submitScan = useCallback(
    (data: { value: string; type: ScanType; rawType: string }) => {
      // Optimistic: show feedback immediately, don't wait for the network round-trip
      setLastScanValue(data.value);
      setFeedbackActive(true);

      // Reset feedback flag after a short delay so it can re-trigger on the next scan
      setTimeout(() => setFeedbackActive(false), 300);

      const payload: CreateScanRequest = {
        value: data.value,
        type: data.type,
        rawType: data.rawType,
        deviceInfo,
      };

      // If offline, queue the scan and show feedback anyway
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        offlineQueueRef.current.push(payload);
        return;
      }

      // Fire-and-forget POST — errors are logged but don't block the UI
      fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Network failed mid-request — queue for retry
        offlineQueueRef.current.push(payload);
      });
    },
    [deviceInfo],
  );

  const { videoRef, isLoading, isActive, error, torchSupported, toggleTorch } =
    useScanner({ onScan: submitScan });

  // --- Error states ---

  if (error === "PERMISSION_DENIED") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl bg-gray-900/80 p-8 backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Camera Access Denied</h2>
          <p className="mt-3 text-sm text-gray-400">
            The scanner needs camera access to read QR codes and barcodes.
          </p>
          <div className="mt-4 rounded-lg bg-gray-800 p-4 text-left text-xs text-gray-300">
            <p className="font-medium text-gray-200">How to enable:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><strong>iOS Safari:</strong> Settings → Safari → Camera → Allow</li>
              <li><strong>Android Chrome:</strong> Tap the lock icon in the address bar → Permissions → Camera → Allow</li>
              <li><strong>Desktop:</strong> Click the camera icon in the address bar</li>
            </ul>
          </div>
          <Link
            href="/history"
            className="mt-6 inline-block rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600"
          >
            View History
          </Link>
        </div>
      </div>
    );
  }

  if (error === "INSECURE_CONTEXT") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl bg-gray-900/80 p-8 backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">HTTPS Required</h2>
          <p className="mt-3 text-sm text-gray-400">
            Camera access requires a secure (HTTPS) connection. Mobile browsers block
            camera access on plain HTTP for privacy.
          </p>
          <div className="mt-4 rounded-lg bg-gray-800 p-4 text-left text-xs text-gray-300">
            <p className="font-medium text-gray-200">How to fix:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Access this app via <strong>https://</strong> instead of http://</li>
              <li>On localhost, camera access works without HTTPS</li>
              <li>For local network testing, set up a local HTTPS proxy</li>
            </ul>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <ManualEntry onSubmit={submitScan} />
            <Link
              href="/history"
              className="inline-block rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              View History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error === "NO_CAMERA" || error === "UNKNOWN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <ManualEntry onSubmit={submitScan} />
        <Link
          href="/history"
          className="mt-6 text-sm text-gray-400 underline underline-offset-2 transition-colors hover:text-white"
        >
          View Scan History
        </Link>
      </div>
    );
  }

  // --- Scanner view ---

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      {/* Camera feed — iOS Safari requires playsInline and muted or getUserMedia silently fails */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        playsInline
        muted
        aria-label="Camera viewfinder for scanning codes"
      />

      {/* Overlay with animated corner brackets — decorative, hidden from screen readers */}
      <ScanOverlay isSuccess={feedbackActive} />

      {/* Success feedback — flash, vibration, beep, toast */}
      <ScanFeedback isActive={feedbackActive} value={lastScanValue} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
            <p className="text-sm text-gray-300">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Top bar — torch toggle + status */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-safe-top">
        <div className="mt-4 flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isActive ? "bg-green-400" : "bg-yellow-400"}`}
            aria-hidden="true"
          />
          <span className="text-xs text-gray-300">
            {isActive ? "Scanning" : "Starting…"}
          </span>
        </div>

        {torchSupported && (
          <button
            onClick={toggleTorch}
            className="mt-4 rounded-full bg-gray-800/70 p-3 backdrop-blur-sm transition-colors hover:bg-gray-700/70"
            aria-label="Toggle flashlight"
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom bar — history link */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe-bottom">
        <div className="flex justify-center pb-8">
          <Link
            href="/history"
            className="rounded-full bg-gray-800/70 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-gray-700/70"
          >
            View History
          </Link>
        </div>
      </div>
    </div>
  );
}
