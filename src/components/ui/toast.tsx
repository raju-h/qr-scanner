"use client";

/**
 * Toast notification — fixed-position auto-dismissing popup.
 * Supports configurable duration and enter/exit animations.
 */

import { useEffect } from "react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  /** Auto-dismiss delay in milliseconds (default: 3000). */
  duration?: number;
}

export function Toast({
  message,
  isVisible,
  onDismiss,
  duration = 3_000,
}: ToastProps): React.ReactElement | null {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss, duration]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up rounded-xl bg-gray-900/95 px-4 py-3 shadow-lg backdrop-blur-sm"
    >
      <p className="text-center text-sm text-gray-200">{message}</p>
    </div>
  );
}
