/** Tests for ScannerView component. */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the hooks — we test the component's rendering behavior, not the hooks themselves.
const mockUseScanner = vi.fn();
const mockUseDeviceInfo = vi.fn();

vi.mock("@/hooks/use-scanner", () => ({
  useScanner: (...args: unknown[]) => mockUseScanner(...args),
}));

vi.mock("@/hooks/use-device-info", () => ({
  useDeviceInfo: () => mockUseDeviceInfo(),
}));

// Must import after mocks
import { ScannerView } from "@/components/scanner/scanner-view";

/** Default return value for useScanner — active, no error. */
function defaultScannerReturn() {
  return {
    videoRef: React.createRef<HTMLVideoElement>(),
    isLoading: false,
    isActive: true,
    error: null,
    torchSupported: false,
    toggleTorch: vi.fn(),
  };
}

describe("ScannerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeviceInfo.mockReturnValue({
      browser: "Chrome 120",
      os: "Android 14",
      screenWidth: 390,
      screenHeight: 844,
    });
    mockUseScanner.mockReturnValue(defaultScannerReturn());
  });

  it("renders video element with correct attributes", () => {
    render(<ScannerView />);

    const video = screen.getByLabelText("Camera viewfinder for scanning codes");
    expect(video.tagName).toBe("VIDEO");
    // iOS Safari requires these attributes or getUserMedia fails silently
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("playsinline");
    // React sets muted as a DOM property, not an HTML attribute, so check the property
    expect((video as HTMLVideoElement).muted).toBe(true);
  });

  it("shows permission denied message on NotAllowedError", () => {
    mockUseScanner.mockReturnValue({
      ...defaultScannerReturn(),
      isActive: false,
      error: "PERMISSION_DENIED",
    });

    render(<ScannerView />);

    expect(screen.getByText("Camera Access Denied")).toBeTruthy();
    // Should include platform-specific instructions
    expect(screen.getByText(/iOS Safari/)).toBeTruthy();
    expect(screen.getByText(/Android Chrome/)).toBeTruthy();
  });

  it("shows manual entry fallback when no camera", () => {
    mockUseScanner.mockReturnValue({
      ...defaultScannerReturn(),
      isActive: false,
      error: "NO_CAMERA",
    });

    render(<ScannerView />);

    expect(screen.getByText("Manual Entry")).toBeTruthy();
    expect(screen.getByLabelText("Code value")).toBeTruthy();
    expect(screen.getByText("Submit Scan")).toBeTruthy();
  });

  it("renders scan overlay on top of video", () => {
    render(<ScannerView />);

    // The ScanOverlay renders corner brackets inside a pointer-events-none wrapper.
    expect(screen.getByLabelText("Camera viewfinder for scanning codes")).toBeTruthy();
    // The overlay div has animate-scan-pulse classes on the corner brackets
    const brackets = document.querySelectorAll(".animate-scan-pulse");
    expect(brackets.length).toBe(4);
  });

  it("shows navigation link to history", () => {
    render(<ScannerView />);

    const link = screen.getByText("View History");
    expect(link).toBeTruthy();
    expect(link.closest("a")).toHaveAttribute("href", "/history");
  });
});
