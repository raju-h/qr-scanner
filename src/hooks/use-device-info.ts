"use client";
/**
 * Device info hook — detects browser, OS, and screen dimensions for scan metadata.
 * Memoized because navigator.userAgent and screen dimensions won't change within a session.
 */

import { useMemo } from "react";
import type { DeviceInfo } from "@/types";

/**
 * Parse the browser name and version from the User-Agent string.
 * Handles the major mobile browsers: Safari, Chrome, Firefox, Samsung Internet.
 */
function parseBrowser(ua: string): string {
  // Order matters — Chrome UA also contains "Safari", so check Chrome first
  if (ua.includes("SamsungBrowser")) {
    const match = ua.match(/SamsungBrowser\/([\d.]+)/);
    return `Samsung Internet ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("CriOS")) {
    const match = ua.match(/CriOS\/([\d.]+)/);
    return `Chrome iOS ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return `Chrome ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Firefox") || ua.includes("FxiOS")) {
    const match = ua.match(/(?:Firefox|FxiOS)\/([\d.]+)/);
    return `Firefox ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Safari") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/([\d.]+)/);
    return `Safari ${match?.[1] ?? ""}`.trim();
  }
  return "Unknown";
}

/**
 * Parse the OS name and version from the User-Agent string.
 */
function parseOS(ua: string): string {
  if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) {
    const match = ua.match(/OS ([\d_]+)/);
    const version = match?.[1]?.replace(/_/g, ".") ?? "";
    return `iOS ${version}`.trim();
  }
  if (ua.includes("Android")) {
    const match = ua.match(/Android ([\d.]+)/);
    return `Android ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown";
}

/**
 * Detect browser, OS, and screen dimensions.
 * Safe to call during SSR — returns empty object when `window` is undefined.
 */
export function useDeviceInfo(): DeviceInfo {
  return useMemo((): DeviceInfo => {
    if (typeof window === "undefined") return {};

    const ua = navigator.userAgent;
    return {
      browser: parseBrowser(ua),
      os: parseOS(ua),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  }, []);
}
