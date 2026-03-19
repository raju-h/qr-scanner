/**
 * Empty state — shown when no scans exist in history.
 * Provides a friendly illustration and a link back to the scanner.
 */

import Link from "next/link";

export function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {/* Stylised QR icon built with Tailwind — no external image needed */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800/60">
        <svg
          className="h-10 w-10 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3zm-3 3h3v-3"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-white">No scans yet</h2>
      <p className="mt-2 max-w-xs text-sm text-gray-400">
        Point your camera at a QR code or barcode to get started.
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Open Scanner
      </Link>
    </div>
  );
}
