/**
 * Type badge — small pill displaying scan type with distinct colors.
 * Blue for QR codes, amber for EAN-13 barcodes.
 */

import type { ScanType } from "@/types";

type BadgeVariant = "qr" | "ean13" | "default";

interface BadgeProps {
  type: ScanType;
}

const VARIANT_MAP: Record<ScanType, BadgeVariant> = {
  QR_CODE: "qr",
  EAN_13: "ean13",
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  qr: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  ean13: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  default: "bg-gray-500/15 text-gray-400 ring-gray-500/25",
};

const VARIANT_LABELS: Record<ScanType, string> = {
  QR_CODE: "QR",
  EAN_13: "EAN-13",
};

export function Badge({ type }: BadgeProps): React.ReactElement {
  const variant = VARIANT_MAP[type] ?? "default";
  const classes = VARIANT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${classes}`}
    >
      {VARIANT_LABELS[type] ?? type}
    </span>
  );
}
