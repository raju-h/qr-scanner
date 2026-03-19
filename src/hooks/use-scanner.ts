"use client";
/**
 * Camera scanner hook — manages camera stream, @zxing decoding, and scan deduplication.
 * Works on both iOS Safari (requires playsInline + muted on <video>) and Android Chrome.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import type { ScannerError, ScanType } from "@/types";

/** Ignore repeat scans of the same value within this window. */
const DEDUP_WINDOW_MS = 3_000;

interface UseScannerOptions {
  /** Called when a unique scan is decoded (after dedup). */
  onScan: (result: { value: string; type: ScanType; rawType: string }) => void;
}

interface UseScannerReturn {
  /** Ref to attach to the <video> element — the hook streams camera frames into it. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** True while camera is initialising (before first frame). */
  isLoading: boolean;
  /** True when the scanner is actively decoding frames. */
  isActive: boolean;
  /** Set when camera access fails. */
  error: ScannerError | null;
  /** Whether the device camera supports torch/flashlight. */
  torchSupported: boolean;
  /** Toggle torch on/off — no-ops if unsupported. */
  toggleTorch: () => Promise<void>;
}

/**
 * Map @zxing BarcodeFormat enum to our ScanType string union.
 * Falls back to "QR_CODE" for any unrecognised format so the API always gets a valid type.
 */
function mapBarcodeFormat(format: BarcodeFormat): ScanType {
  if (format === BarcodeFormat.EAN_13) return "EAN_13";
  return "QR_CODE";
}

export function useScanner({ onScan }: UseScannerOptions): UseScannerReturn {
  // Typed as RefObject<HTMLVideoElement> for compatibility with <video ref={...}> — the
  // null initial value is valid because React sets .current before the component mounts.
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<ScannerError | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Dedup tracking — stored in refs so they don't trigger re-renders
  const lastValueRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);

  // Keep a stable reference to the latest onScan so we don't restart scanning
  // every time the parent re-renders with a new callback identity
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function startScanning(): Promise<void> {
      try {
        // Pre-flight: getUserMedia requires a secure context (HTTPS or localhost).
        // On HTTP, navigator.mediaDevices is undefined on mobile browsers — detect
        // this early and show a clear error instead of a stuck loading screen.
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setError("INSECURE_CONTEXT");
          setIsLoading(false);
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("NO_CAMERA");
          setIsLoading(false);
          return;
        }

        // Request camera — facingMode "environment" picks the rear camera on mobile.
        // Safari requires getUserMedia before passing the stream to @zxing.
        // Min 640px width ensures enough resolution for decoding lower-quality codes.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { min: 640, ideal: 1920 },
            height: { min: 480, ideal: 1080 },
          },
          audio: false,
        });

        // Request continuous autofocus after acquiring the stream — not all
        // devices support it, so apply as a best-effort constraint.
        const videoTrackForFocus = stream.getVideoTracks()[0];
        if (videoTrackForFocus) {
          try {
            await videoTrackForFocus.applyConstraints({
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            });
          } catch {
            // focusMode not supported on this device — that's fine
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability on the video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities = videoTrack.getCapabilities();
            // torch is a non-standard capability — cast to check
            if ((capabilities as Record<string, unknown>)["torch"]) {
              setTorchSupported(true);
            }
          } catch {
            // getCapabilities not available on all browsers — that's fine
          }
        }

        // Assign stream to the video element. Safari needs this done manually
        // when the video element already exists in the DOM.
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Configure decode hints for better scanning of lower-quality codes:
        // - TRY_HARDER: spend more CPU per frame, try rotated orientations (0°/90°/180°/270°)
        // - POSSIBLE_FORMATS: only probe QR + EAN-13 instead of all formats (faster per frame)
        const hints = new Map<DecodeHintType, unknown>();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
        ]);

        const reader = new BrowserMultiFormatReader(hints);

        // Decode continuously from our stream — NOT decodeFromVideoDevice which
        // opens a second camera stream with default (low) resolution constraints
        const controls = await reader.decodeFromStream(
          stream,
          videoRef.current ?? undefined,
          (result, _error, _controls) => {
            if (!result) return;

            const value = result.getText();
            const now = Date.now();

            // Dedup: skip if same value within the window
            if (
              value === lastValueRef.current &&
              now - lastTimeRef.current < DEDUP_WINDOW_MS
            ) {
              return;
            }

            lastValueRef.current = value;
            lastTimeRef.current = now;

            const format = result.getBarcodeFormat();
            onScanRef.current({
              value,
              type: mapBarcodeFormat(format),
              rawType: BarcodeFormat[format] ?? "UNKNOWN",
            });
          },
        );

        if (cancelled) {
          controls.stop();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        controlsRef.current = controls;
        setIsActive(true);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("PERMISSION_DENIED");
          } else if (
            err.name === "NotFoundError" ||
            err.name === "DevicesNotFoundError" ||
            err.name === "OverconstrainedError"
          ) {
            setError("NO_CAMERA");
          } else {
            setError("UNKNOWN");
          }
        } else {
          setError("UNKNOWN");
        }
        setIsLoading(false);
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      // Stop all media tracks so the camera LED turns off
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      controlsRef.current = null;
    };
  }, []); // Only run once on mount

  const toggleTorch = useCallback(async (): Promise<void> => {
    const stream = streamRef.current;
    if (!stream || !torchSupported) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Torch toggle failed — device may not actually support it despite advertising
      setTorchSupported(false);
    }
  }, [torchOn, torchSupported]);

  return {
    videoRef,
    isLoading,
    isActive,
    error,
    torchSupported,
    toggleTorch,
  };
}
