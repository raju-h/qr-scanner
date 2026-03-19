"use client";

/**
 * Animated scan overlay — renders a semi-transparent mask with a clear center
 * region bordered by animated corner brackets. Purely decorative — hidden
 * from screen readers with aria-hidden.
 */

interface ScanOverlayProps {
  /** When true the corner brackets turn green briefly to confirm a scan. */
  isSuccess: boolean;
}

export function ScanOverlay({ isSuccess }: ScanOverlayProps): React.ReactElement {
  const bracketColor = isSuccess ? "border-green-400" : "border-white";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Semi-transparent dark overlay with a transparent hole in the center.
          Larger 280px viewfinder encourages users to hold the phone closer. */}
      <div className="absolute inset-x-0 top-0 bg-black/50" style={{ bottom: "calc(50% + 140px)" }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/50" style={{ top: "calc(50% + 140px)" }} />
      <div className="absolute left-0 bg-black/50" style={{ top: "calc(50% - 140px)", bottom: "calc(50% - 140px)", right: "calc(50% + 140px)" }} />
      <div className="absolute right-0 bg-black/50" style={{ top: "calc(50% - 140px)", bottom: "calc(50% - 140px)", left: "calc(50% + 140px)" }} />

      {/* Scan region — 280×280px centered box with animated corner brackets */}
      <div className="relative h-[280px] w-[280px]">
        <div className={`absolute left-0 top-0 h-8 w-8 animate-scan-pulse rounded-tl-lg border-l-[3px] border-t-[3px] ${bracketColor}`} />
        <div className={`absolute right-0 top-0 h-8 w-8 animate-scan-pulse rounded-tr-lg border-r-[3px] border-t-[3px] ${bracketColor}`} />
        <div className={`absolute bottom-0 left-0 h-8 w-8 animate-scan-pulse rounded-bl-lg border-b-[3px] border-l-[3px] ${bracketColor}`} />
        <div className={`absolute bottom-0 right-0 h-8 w-8 animate-scan-pulse rounded-br-lg border-b-[3px] border-r-[3px] ${bracketColor}`} />

        {/* Horizontal scan line that sweeps down */}
        <div className="absolute inset-x-2 top-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    </div>
  );
}
