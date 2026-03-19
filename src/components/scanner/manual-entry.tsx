"use client";

/**
 * Manual entry fallback — shown when camera is unavailable.
 * Lets the user type a barcode value and select a type before submitting.
 * Uses the same Zod schema as the API for DRY validation.
 */

import { useState } from "react";
import { createScanSchema } from "@/lib/validators";
import type { ScanType } from "@/types";

interface ManualEntryProps {
  /** Called with the validated value, type, and raw type string. */
  onSubmit: (data: { value: string; type: ScanType; rawType: string }) => void;
}

export function ManualEntry({ onSubmit }: ManualEntryProps): React.ReactElement {
  const [value, setValue] = useState("");
  const [type, setType] = useState<ScanType>("QR_CODE");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setValidationError(null);

    const result = createScanSchema.safeParse({
      value: value.trim(),
      type,
      rawType: type,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    onSubmit({ value: result.data.value, type, rawType: type });
    setValue("");
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4">
      <div className="rounded-2xl bg-gray-900/80 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white">Manual Entry</h2>
        <p className="mt-1 text-sm text-gray-400">
          Camera unavailable — type or paste a code value below.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="scan-value" className="block text-sm font-medium text-gray-300">
              Code value
            </label>
            <input
              id="scan-value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://example.com or 5901234123457"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="scan-type" className="block text-sm font-medium text-gray-300">
              Code type
            </label>
            <select
              id="scan-type"
              value={type}
              onChange={(e) => setType(e.target.value as ScanType)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="QR_CODE">QR Code</option>
              <option value="EAN_13">EAN-13 Barcode</option>
            </select>
          </div>

          {validationError && (
            <p className="text-sm text-red-400" role="alert">
              {validationError}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Submit Scan
          </button>
        </form>
      </div>
    </div>
  );
}
