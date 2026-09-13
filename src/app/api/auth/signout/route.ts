import { assertSameOrigin, toErrorResponse } from "@/lib/security/request";
import { destroySession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    await destroySession();
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
