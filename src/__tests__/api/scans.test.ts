/** Tests for POST /api/scans and GET /api/scans API routes. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ScanType as PrismaScanType } from "@/generated/prisma/client";

// Mock Prisma — must be declared before importing the route handler
vi.mock("@/lib/prisma", () => ({
  prisma: {
    scan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock SSE manager so broadcasts don't affect other tests
vi.mock("@/lib/sse", () => ({
  sseManager: { broadcast: vi.fn() },
}));

import { GET, POST } from "@/app/api/scans/route";
import { prisma } from "@/lib/prisma";
import { sseManager } from "@/lib/sse";

/** Helper to build a NextRequest with the given URL and optional JSON body. */
function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function makePostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Fake Prisma Scan row returned from create / findMany / findFirst. */
function fakeScan(overrides: Record<string, unknown> = {}) {
  const now = new Date("2024-12-25T10:30:00.000Z");
  return {
    id: "test-id-1",
    value: "https://example.com",
    type: PrismaScanType.QR_CODE,
    rawType: "QR_CODE",
    timestamp: now,
    deviceInfo: null,
    createdAt: now,
    ...overrides,
  };
}

describe("POST /api/scans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a scan with valid QR code data", async () => {
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockResolvedValue(fakeScan());

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("test-id-1");
    expect(json.value).toBe("https://example.com");
    expect(json.type).toBe("QR_CODE");
    expect(json.timestamp).toBeDefined();
  });

  it("creates a scan with valid EAN-13 data", async () => {
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockResolvedValue(
      fakeScan({ value: "5901234123457", type: PrismaScanType.EAN_13 }),
    );

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "5901234123457",
        type: "EAN_13",
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.type).toBe("EAN_13");
  });

  it("rejects missing value field with 400", async () => {
    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", { type: "QR_CODE" }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("rejects invalid scan type with 400", async () => {
    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "test",
        type: "INVALID",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("rejects duplicate scan within 3-second window with 409", async () => {
    // findFirst returns an existing scan — simulating a duplicate within dedup window
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(fakeScan());

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
      }),
    );

    expect(res.status).toBe(409);
    expect(prisma.scan.create).not.toHaveBeenCalled();
  });

  it("allows same value after 3-second window", async () => {
    // findFirst returns null — no recent duplicate found (window has passed)
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockResolvedValue(fakeScan());

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
      }),
    );

    expect(res.status).toBe(201);
  });

  it("stores device info as JSON", async () => {
    const deviceInfo = { browser: "Safari 17", os: "iOS 17.4", screenWidth: 390, screenHeight: 844 };
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockResolvedValue(fakeScan({ deviceInfo }));

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
        deviceInfo,
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.deviceInfo).toEqual(deviceInfo);

    // Verify Prisma was called with the deviceInfo
    expect(prisma.scan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deviceInfo }),
      }),
    );
  });

  it("handles database errors gracefully", async () => {
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
      }),
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
    // Should not leak internal details
    expect(json.error).not.toContain("connection");
  });

  it("broadcasts the new scan via SSE manager", async () => {
    vi.mocked(prisma.scan.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scan.create).mockResolvedValue(fakeScan());

    await POST(
      makePostRequest("http://localhost:3000/api/scans", {
        value: "https://example.com",
        type: "QR_CODE",
      }),
    );

    expect(sseManager.broadcast).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/scans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scans in reverse chronological order", async () => {
    const scans = [
      fakeScan({ id: "s3", timestamp: new Date("2024-12-25T12:00:00Z") }),
      fakeScan({ id: "s2", timestamp: new Date("2024-12-25T11:00:00Z") }),
      fakeScan({ id: "s1", timestamp: new Date("2024-12-25T10:00:00Z") }),
    ];
    vi.mocked(prisma.scan.findMany).mockResolvedValue(scans);

    const res = await GET(makeGetRequest("http://localhost:3000/api/scans"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.scans).toHaveLength(3);
    // Prisma mock returns them pre-ordered; verify the handler passes them through
    expect(json.scans[0].id).toBe("s3");
    expect(json.scans[2].id).toBe("s1");
  });

  it("paginates with cursor", async () => {
    // Return 21 items (limit 20 + 1) so hasMore is true
    const page = Array.from({ length: 21 }, (_, i) =>
      fakeScan({ id: `s${i}`, timestamp: new Date(Date.now() - i * 1000) }),
    );
    vi.mocked(prisma.scan.findMany).mockResolvedValue(page);

    const res = await GET(makeGetRequest("http://localhost:3000/api/scans?limit=20"));
    const json = await res.json();

    expect(json.scans).toHaveLength(20);
    expect(json.hasMore).toBe(true);
    expect(json.nextCursor).toBe("s19");
  });

  it("defaults to limit 20", async () => {
    vi.mocked(prisma.scan.findMany).mockResolvedValue([]);

    await GET(makeGetRequest("http://localhost:3000/api/scans"));

    // Prisma should be called with take: 21 (limit 20 + 1 for hasMore check)
    expect(prisma.scan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 21 }),
    );
  });

  it("caps limit at 100", async () => {
    const res = await GET(makeGetRequest("http://localhost:3000/api/scans?limit=200"));

    // The Zod schema rejects limit > 100 — should return 400
    expect(res.status).toBe(400);
  });

  it("filters by scan type", async () => {
    vi.mocked(prisma.scan.findMany).mockResolvedValue([
      fakeScan({ id: "q1", type: PrismaScanType.QR_CODE }),
    ]);

    await GET(makeGetRequest("http://localhost:3000/api/scans?type=QR_CODE"));

    expect(prisma.scan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "QR_CODE" }),
      }),
    );
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.scan.findMany).mockResolvedValue([
      fakeScan({ value: "https://example.com" }),
    ]);

    await GET(makeGetRequest("http://localhost:3000/api/scans?search=example"));

    expect(prisma.scan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          value: { contains: "example", mode: "insensitive" },
        }),
      }),
    );
  });

  it("returns empty array when no scans exist", async () => {
    vi.mocked(prisma.scan.findMany).mockResolvedValue([]);

    const res = await GET(makeGetRequest("http://localhost:3000/api/scans"));
    const json = await res.json();

    expect(json).toEqual({ scans: [], nextCursor: null, hasMore: false });
  });
});
