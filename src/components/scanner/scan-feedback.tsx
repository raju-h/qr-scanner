"use client";

/**
 * Success feedback — green flash animation, haptic vibration, audio beep, and toast.
 * Triggers once per scan event, then auto-dismisses after 3 seconds.
 *
 * Uses a counter approach to avoid setState inside useEffect (React 19 lint rule).
 * The parent increments a key or toggles isActive, and this component tracks
 * the activation via a ref + setTimeout callbacks.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Tiny 200ms 800 Hz beep encoded as a base64 WAV data URI.
 *  Generated offline — avoids an external file download on every scan. */
const BEEP_DATA_URI =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1rZ3F7gIqOk5GOiIJ8d3J0eH6Fio+TlZOPiYR+eHNydn2EipCUl5aTjomDeHFvdHuCiI6Tl5eUkIuFfnhzcnh/hYuRlZiWk4+KhH54c3N4f4WLkJSXlpOPioR+eXR0eH+Fi5CVl5aTj4qEfnl0dHh/hYuQlJeWk4+KhH55dHR4f4WLkJSXlpOPioR+eXR0eH+Fi5CUl5aTj4qEfnl0dHh/hYuQlJeWk4+KhH55dHR4f4WLkJSXlpOPioR+eXR0eH+Fi5CUl5aTj4qEfnl0dHh/hQ==";

interface ScanFeedbackProps {
  /** True when a scan just happened — drives the flash + audio + haptic. */
  isActive: boolean;
  /** The decoded value to display in the toast. */
  value: string | null;
}

export function ScanFeedback({
  isActive,
  value,
}: ScanFeedbackProps): React.ReactElement | null {
  const [showToast, setShowToast] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [toastValue, setToastValue] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevActiveRef = useRef(false);

  // Fire side effects (haptic, audio) and schedule state changes
  // via a callback triggered by detecting prop transitions
  const triggerFeedback = useCallback((scanValue: string) => {
    setShowFlash(true);
    setToastValue(scanValue);
    setShowToast(true);

    // Haptic feedback — works on Android Chrome; Safari ignores it silently
    try {
      navigator.vibrate?.(200);
    } catch {
      // vibrate() throws in some environments (e.g. iframe sandbox)
    }

    // Audio beep
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(BEEP_DATA_URI);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay policy may block the first beep — that's acceptable
      });
    } catch {
      // Audio constructor not available in test environments
    }

    // Green flash — 200ms then gone
    setTimeout(() => setShowFlash(false), 200);
    // Toast — auto-dismiss after 3 seconds
    setTimeout(() => setShowToast(false), 3_000);
  }, []);

  // Detect rising edge of isActive prop (false → true).
  // The setState calls inside triggerFeedback are intentional — they drive the
  // 200ms flash and 3s toast animations in response to the parent's scan event.
  useEffect(() => {
    if (isActive && !prevActiveRef.current && value) {
      triggerFeedback(value); // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevActiveRef.current = isActive;
  }, [isActive, value, triggerFeedback]);

  return (
    <>
      {/* Full-screen green flash overlay */}
      {showFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-30 border-4 border-green-400 bg-green-400/10"
          aria-hidden="true"
        />
      )}

      {/* Toast notification at the bottom */}
      {showToast && toastValue && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-24 left-4 right-4 z-40 animate-slide-up rounded-xl bg-gray-900/95 px-4 py-3 shadow-lg backdrop-blur-sm"
        >
          <p className="text-center text-sm font-medium text-green-400">
            Scan successful
          </p>
          <p className="mt-1 truncate text-center text-xs text-gray-300">
            {toastValue}
          </p>
        </div>
      )}
    </>
  );
}
