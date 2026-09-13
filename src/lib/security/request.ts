import { headers } from "next/headers";

/*
  Request-level checks shared by every route handler.
*/

/** Best-effort client IP behind Vercel's proxy. Only for rate limiting and audit, never for auth. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Rejects cross-site state changes. Browsers always send Origin on POST, so a
 * missing or foreign Origin on a mutating request is treated as hostile.
 * Webhooks skip this and verify a signature instead.
 */
export async function assertSameOrigin(req: Request): Promise<void> {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) throw new ForbiddenError("missing_origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ForbiddenError("bad_origin");
  }
  if (originHost !== host) throw new ForbiddenError("cross_origin");
}

export class ForbiddenError extends Error {
  constructor(public code: string) {
    super(code);
  }
  toResponse(): Response {
    return Response.json({ error: this.code }, { status: 403 });
  }
}

/** Uniform error handling for route handlers. Known errors map to responses, unknown ones become 500 without leaking detail. */
export function toErrorResponse(err: unknown): Response {
  if (err && typeof err === "object" && "toResponse" in err && typeof err.toResponse === "function") {
    return (err as { toResponse: () => Response }).toResponse();
  }
  console.error(err);
  return Response.json({ error: "internal" }, { status: 500 });
}
