import { getViewer } from "@/lib/viewer";
import { toErrorResponse } from "@/lib/security/request";

/**
 * What the success screen polls after checkout closes.
 *
 * The browser comes back from Razorpay before the webhook necessarily has, so
 * the client waits on this rather than asserting anything itself. It reads the
 * same viewer state every page uses, which means there is exactly one source of
 * truth for whether someone is gold.
 */
export async function GET() {
  try {
    const viewer = await getViewer();
    return Response.json(
      { state: viewer.state, goldUntil: viewer.goldUntil },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
