/** Shared TypeScript types used by both client and server. */

/**
 * Scan type — matches the Prisma ScanType enum as a string union.
 * Using a string union (not a TS enum) so it's interchangeable with Prisma's generated type.
 */
export type ScanType = "QR_CODE" | "EAN_13";

export interface Scan {
  id: string;
  value: string;
  type: ScanType;
  rawType: string | null;
  timestamp: string;
  deviceInfo: DeviceInfo | null;
  createdAt: string;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface PaginatedScans {
  scans: Scan[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateScanRequest {
  value: string;
  type: ScanType;
  rawType?: string;
  deviceInfo?: DeviceInfo;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export type ScannerStatus = "idle" | "scanning" | "error";

export type ScannerError = "PERMISSION_DENIED" | "NO_CAMERA" | "INSECURE_CONTEXT" | "UNKNOWN";
