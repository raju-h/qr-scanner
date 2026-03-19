/** Tests for useScanner hook — camera permission, @zxing decoding, dedup, cleanup. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ScannerError } from "@/types";

// --- Mock @zxing/browser ---

/** Capture the decode callback so tests can simulate scans. */
let decodeCallback: ((result: unknown, error: unknown, controls: unknown) => void) | null = null;
const mockScannerStop = vi.fn();

vi.mock("@zxing/browser", () => {
  const BarcodeFormat = {
    QR_CODE: 11,
    EAN_13: 7,
    11: "QR_CODE",
    7: "EAN_13",
  };

  class MockBrowserMultiFormatReader {
    async decodeFromStream(
      _stream: unknown,
      _videoElem: unknown,
      callback: (result: unknown, error: unknown, controls: unknown) => void,
    ) {
      decodeCallback = callback;
      return { stop: mockScannerStop };
    }
  }

  return {
    BarcodeFormat,
    BrowserMultiFormatReader: MockBrowserMultiFormatReader,
  };
});

vi.mock("@zxing/library", () => ({
  DecodeHintType: {
    TRY_HARDER: 3,
    POSSIBLE_FORMATS: 2,
  },
}));

import { useScanner } from "@/hooks/use-scanner";

/** Build a fake @zxing Result object. */
function fakeResult(text: string, format: number) {
  return {
    getText: () => text,
    getBarcodeFormat: () => format,
  };
}

/** Set up navigator.mediaDevices.getUserMedia to resolve with a mock stream. */
function mockGetUserMediaSuccess() {
  const mockTrackStop = vi.fn();
  const mockTrack = { stop: mockTrackStop, getCapabilities: vi.fn(() => ({})) };
  const mockStream = {
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    writable: true,
    configurable: true,
  });
  return { mockTrackStop };
}

/** Set up navigator.mediaDevices.getUserMedia to reject. */
function mockGetUserMediaError(name: string) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", name)) },
    writable: true,
    configurable: true,
  });
}

describe("useScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decodeCallback = null;
    // The hook checks window.isSecureContext before calling getUserMedia —
    // jsdom defaults to false, so we override it for tests.
    Object.defineProperty(window, "isSecureContext", { value: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests camera permission on mount", async () => {
    mockGetUserMediaSuccess();

    renderHook(() => useScanner({ onScan: vi.fn() }));

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { ideal: "environment" } }),
          audio: false,
        }),
      );
    });
  });

  it("sets error state on permission denial", async () => {
    mockGetUserMediaError("NotAllowedError");

    const { result } = renderHook(() =>
      useScanner({ onScan: vi.fn() }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe<ScannerError>("PERMISSION_DENIED");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("sets error state when no camera available", async () => {
    mockGetUserMediaError("NotFoundError");

    const { result } = renderHook(() =>
      useScanner({ onScan: vi.fn() }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe<ScannerError>("NO_CAMERA");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("calls onScan callback with decoded result", async () => {
    mockGetUserMediaSuccess();
    const onScan = vi.fn();

    renderHook(() => useScanner({ onScan }));

    await waitFor(() => expect(decodeCallback).not.toBeNull());

    act(() => {
      decodeCallback!(fakeResult("https://example.com", 11), undefined, {});
    });

    expect(onScan).toHaveBeenCalledWith({
      value: "https://example.com",
      type: "QR_CODE",
      rawType: "QR_CODE",
    });
  });

  it("debounces duplicate scans within 3 seconds", async () => {
    mockGetUserMediaSuccess();
    const onScan = vi.fn();

    renderHook(() => useScanner({ onScan }));

    await waitFor(() => expect(decodeCallback).not.toBeNull());

    act(() => {
      decodeCallback!(fakeResult("same-value", 11), undefined, {});
    });

    // Immediate duplicate — should be ignored
    act(() => {
      decodeCallback!(fakeResult("same-value", 11), undefined, {});
    });

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("cleans up camera stream on unmount", async () => {
    const { mockTrackStop } = mockGetUserMediaSuccess();
    const onScan = vi.fn();

    const { unmount } = renderHook(() => useScanner({ onScan }));

    await waitFor(() => expect(decodeCallback).not.toBeNull());

    unmount();

    expect(mockTrackStop).toHaveBeenCalled();
    expect(mockScannerStop).toHaveBeenCalled();
  });
});
