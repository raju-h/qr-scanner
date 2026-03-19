/** Tests for Zod validation schemas. */
import { describe, it, expect } from "vitest";
import { createScanSchema, listScansSchema, deviceInfoSchema } from "@/lib/validators";

describe("createScanSchema", () => {
  it("accepts valid QR code scan", () => {
    const result = createScanSchema.safeParse({
      value: "https://example.com",
      type: "QR_CODE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid EAN-13 scan", () => {
    const result = createScanSchema.safeParse({
      value: "5901234123457",
      type: "EAN_13",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty value", () => {
    const result = createScanSchema.safeParse({
      value: "",
      type: "QR_CODE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects value exceeding 4096 characters", () => {
    const result = createScanSchema.safeParse({
      value: "a".repeat(4097),
      type: "QR_CODE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid scan type", () => {
    const result = createScanSchema.safeParse({
      value: "test",
      type: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional deviceInfo", () => {
    const result = createScanSchema.safeParse({
      value: "test",
      type: "QR_CODE",
      deviceInfo: { browser: "Chrome 120", os: "Android 14" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts scan without optional fields", () => {
    const result = createScanSchema.safeParse({
      value: "test",
      type: "QR_CODE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rawType).toBeUndefined();
      expect(result.data.deviceInfo).toBeUndefined();
    }
  });

  it("accepts rawType as optional string", () => {
    const result = createScanSchema.safeParse({
      value: "test",
      type: "QR_CODE",
      rawType: "QR_CODE",
    });
    expect(result.success).toBe(true);
  });
});

describe("listScansSchema", () => {
  it("provides default limit of 20", () => {
    const result = listScansSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("caps limit at 100", () => {
    const result = listScansSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it("accepts valid type filter", () => {
    const result = listScansSchema.parse({ type: "QR_CODE" });
    expect(result.type).toBe("QR_CODE");
  });

  it("rejects invalid type filter", () => {
    const result = listScansSchema.safeParse({ type: "INVALID" });
    expect(result.success).toBe(false);
  });
});

describe("deviceInfoSchema", () => {
  it("accepts all optional fields", () => {
    const result = deviceInfoSchema.safeParse({
      browser: "Safari 17",
      os: "iOS 17.4",
      screenWidth: 390,
      screenHeight: 844,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = deviceInfoSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
