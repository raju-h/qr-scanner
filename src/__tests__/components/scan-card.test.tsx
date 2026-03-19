/** Tests for ScanCard component. */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScanCard } from "@/components/history/scan-card";
import type { ScanWithMeta } from "@/hooks/use-scans";

function makeScan(overrides: Partial<ScanWithMeta> = {}): ScanWithMeta {
  return {
    id: "test-id",
    value: "https://example.com",
    type: "QR_CODE",
    rawType: "QR_CODE",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    deviceInfo: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ScanCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders scan value and type badge", () => {
    render(<ScanCard scan={makeScan()} />);

    expect(screen.getByText("https://example.com")).toBeTruthy();
    expect(screen.getByText("QR")).toBeTruthy();
  });

  it("truncates long values with ellipsis", () => {
    const longValue = "a".repeat(100);
    render(<ScanCard scan={makeScan({ value: longValue })} />);

    // The displayed text should be truncated to 80 chars + ellipsis
    const displayed = screen.getByTitle(longValue);
    expect(displayed.textContent!.length).toBeLessThan(longValue.length);
    expect(displayed.textContent).toContain("…");
  });

  it("shows relative timestamp", () => {
    render(<ScanCard scan={makeScan()} />);

    // date-fns formatDistanceToNow for 5 minutes ago
    expect(screen.getByText(/minutes? ago/)).toBeTruthy();
  });

  it("copies value to clipboard on button click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ScanCard scan={makeScan()} />);

    const copyButton = screen.getByLabelText("Copy value");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://example.com");
    });

    // Button label should change to "Copied"
    expect(screen.getByLabelText("Copied")).toBeTruthy();
  });

  it("shows distinct badge colors for QR vs EAN-13", () => {
    const { container: qrContainer } = render(
      <ScanCard scan={makeScan({ type: "QR_CODE" })} />,
    );
    const { container: eanContainer } = render(
      <ScanCard scan={makeScan({ type: "EAN_13", id: "ean-id" })} />,
    );

    const qrBadge = qrContainer.querySelector("span");
    const eanBadge = eanContainer.querySelector("span");

    // QR uses blue classes, EAN-13 uses amber — they should differ
    expect(qrBadge?.className).toContain("blue");
    expect(eanBadge?.className).toContain("amber");
    expect(qrBadge?.textContent).toBe("QR");
    expect(eanBadge?.textContent).toBe("EAN-13");
  });

  it("renders URL values as tappable links", () => {
    render(<ScanCard scan={makeScan({ value: "https://example.com" })} />);

    const link = screen.getByRole("link", { name: /example\.com/ });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders non-URL values as plain text", () => {
    render(<ScanCard scan={makeScan({ value: "5901234123457" })} />);

    // Should NOT be a link
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("5901234123457")).toBeTruthy();
  });
});
