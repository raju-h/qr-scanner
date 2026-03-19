/** CSV export endpoint — streams scan history as a downloadable CSV file. */
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { listScansSchema } from "@/lib/validators";
import { Prisma } from "@/generated/prisma/client";
import type { DeviceInfo } from "@/types";

/**
 * Escape a CSV field — wrap in double quotes if it contains commas, quotes, or newlines.
 * @param field - Raw string value
 * @returns Properly escaped CSV cell
 */
function escapeCsv(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * GET /api/scans/export — download scan history as CSV.
 * Accepts the same filter params as the list endpoint (type, search).
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const params = listScansSchema.parse({
      cursor: undefined,
      limit: undefined,
      search: url.searchParams.get("search") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });

    const where: Prisma.ScanWhereInput = {};
    if (params.type) where.type = params.type;
    if (params.search) where.value = { contains: params.search, mode: "insensitive" };

    const scans = await prisma.scan.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const header = "id,value,type,timestamp,browser,os\n";
    const rows = scans.map((scan) => {
      const info = (scan.deviceInfo ?? {}) as DeviceInfo;
      return [
        escapeCsv(scan.id),
        escapeCsv(scan.value),
        escapeCsv(scan.type),
        escapeCsv(scan.timestamp.toISOString()),
        escapeCsv(info.browser ?? ""),
        escapeCsv(info.os ?? ""),
      ].join(",");
    });

    const csv = header + rows.join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="scans-export.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/scans/export failed:", error);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
