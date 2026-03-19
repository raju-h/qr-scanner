/** API route for scan CRUD — GET lists paginated scans, POST creates a new scan. */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createScanSchema, listScansSchema } from "@/lib/validators";
import { sseManager } from "@/lib/sse";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { PaginatedScans, ApiError, Scan, ScanType } from "@/types";

/** Duplicate debounce window — ignore repeat scans of the same value within this period. */
const DEDUP_WINDOW_MS = 3_000;

/**
 * GET /api/scans — return paginated scan history, newest first.
 * Supports cursor pagination, type filter, and search filter.
 */
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedScans | ApiError>> {
  try {
    const url = new URL(request.url);
    const params = listScansSchema.parse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });

    const where: Prisma.ScanWhereInput = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.search) {
      // Case-insensitive substring match on the decoded value
      where.value = { contains: params.search, mode: "insensitive" };
    }

    // Fetch one extra record to determine whether more pages exist
    const scans = await prisma.scan.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = scans.length > params.limit;
    const results = hasMore ? scans.slice(0, params.limit) : scans;
    const nextCursor = hasMore ? results[results.length - 1]?.id ?? null : null;

    // Serialize Date fields to ISO strings and coerce Prisma enum to string union
    const serialized: Scan[] = results.map((s) => ({
      id: s.id,
      value: s.value,
      type: s.type as ScanType,
      rawType: s.rawType,
      timestamp: s.timestamp.toISOString(),
      createdAt: s.createdAt.toISOString(),
      deviceInfo: s.deviceInfo as Scan["deviceInfo"],
    }));

    return NextResponse.json({ scans: serialized, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }
    console.error("GET /api/scans failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/scans — create a new scan record.
 * Validates input, rejects duplicates within the dedup window, persists to DB,
 * and broadcasts the new scan to all SSE-connected clients.
 */
export async function POST(request: NextRequest): Promise<NextResponse<Scan | ApiError>> {
  try {
    const body: unknown = await request.json();
    const data = createScanSchema.parse(body);

    // Dedup: reject if the same value was scanned in the last 3 seconds
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
    const duplicate = await prisma.scan.findFirst({
      where: {
        value: data.value,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "desc" },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Duplicate scan — same value was scanned within the last 3 seconds" },
        { status: 409 },
      );
    }

    const scan = await prisma.scan.create({
      data: {
        value: data.value,
        type: data.type,
        rawType: data.rawType ?? null,
        deviceInfo: data.deviceInfo ?? Prisma.JsonNull,
      },
    });

    const serialized: Scan = {
      id: scan.id,
      value: scan.value,
      type: scan.type as ScanType,
      rawType: scan.rawType,
      timestamp: scan.timestamp.toISOString(),
      createdAt: scan.createdAt.toISOString(),
      deviceInfo: scan.deviceInfo as Scan["deviceInfo"],
    };

    // Push to every SSE listener so the history view updates in real time
    sseManager.broadcast(serialized);

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
      console.error("Prisma error in POST /api/scans:", error.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    console.error("POST /api/scans failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
