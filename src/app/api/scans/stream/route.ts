/** SSE endpoint — pushes real-time scan events to connected clients via Server-Sent Events. */
import { sseManager } from "@/lib/sse";

/** Force dynamic — SSE streams must not be statically generated. */
export const dynamic = "force-dynamic";

/**
 * GET /api/scans/stream — open an SSE connection.
 * The response is a ReadableStream that stays open. The SSE manager
 * enqueues scan events and keep-alive comments into each controller.
 */
export async function GET(): Promise<Response> {
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      sseManager.addClient(controller);
    },
    cancel() {
      // Browser closed the connection — clean up so broadcasts skip this client
      if (controllerRef) {
        sseManager.removeClient(controllerRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
