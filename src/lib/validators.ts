/** Zod validation schemas for all API inputs. */
import { z } from "zod";

/** Maximum length for a decoded scan value (QR codes can encode up to ~4296 chars). */
const MAX_SCAN_VALUE_LENGTH = 4096;

export const deviceInfoSchema = z.object({
  browser: z.string().optional(),
  os: z.string().optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
});

export const createScanSchema = z.object({
  value: z.string().min(1, "Scan value is required").max(MAX_SCAN_VALUE_LENGTH, "Scan value too long"),
  type: z.enum(["QR_CODE", "EAN_13"]),
  rawType: z.string().optional(),
  deviceInfo: deviceInfoSchema.optional(),
});

export const listScansSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["QR_CODE", "EAN_13"]).optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
export type ListScansInput = z.infer<typeof listScansSchema>;
export type DeviceInfo = z.infer<typeof deviceInfoSchema>;
