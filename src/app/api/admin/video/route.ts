import { toErrorResponse, clientIp } from "@/lib/security/request";
import { parseBody, videoLookupInput } from "@/lib/security/validators";
import { enforceRate, LIMITS } from "@/lib/security/rate-limit";
import { requireAdmin } from "@/lib/admin";
import { resolveVideo } from "@/lib/video/resolve";
import { assertSameOrigin } from "@/lib/security/request";

/*
  Confirming a pasted link before the lesson is saved.

  Read-only and separate from the save on purpose: it costs an outbound call to
  YouTube, so it runs when the admin finishes typing the link, not on every
  keystroke and not again on submit. Its own limit for the same reason.

  It never blocks a save. The answer is shown to the admin, who can see the
  title and decide; the save has its own eleven character check.
*/
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const admin = await requireAdmin();
    await enforceRate(`admin-video:${admin.userId}`, LIMITS.adminVideoLookup);
    void (await clientIp());

    const { video } = await parseBody(req, videoLookupInput);
    return Response.json(await resolveVideo(video));
  } catch (err) {
    return toErrorResponse(err);
  }
}
