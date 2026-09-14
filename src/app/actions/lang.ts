"use server";

import { revalidatePath } from "next/cache";
import { setLangCookie } from "@/lib/lang";
import { withTenant } from "@/lib/db/tenant";
import type { UserDoc } from "@/lib/db/documents";
import { getViewer } from "@/lib/viewer";

/*
  Switching the interface language.

  A server action in its own module rather than inline in the component,
  because the toggle sits inside the marketing nav, which is a client
  component — and a client component may call a server action but may not
  declare one.

  Written server-side rather than from document.cookie so the form still works
  with no JavaScript: on a weak connection the language switch is exactly the
  control someone needs before the bundle arrives, if the page has loaded in a
  script they cannot read.

  The cookie is the thing that actually drives rendering. For a signed-in
  person it is also mirrored onto users.lang, so the choice follows them to a
  new phone instead of being lost with the browser. The write is best-effort:
  failing to remember the preference must not fail the act of changing it.
*/
export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "hi" ? "hi" : "en";
  await setLangCookie(lang);

  const viewer = await getViewer();
  if (viewer.userId) {
    try {
      await withTenant(viewer.tenantId, (db) => db.updateOne<UserDoc>("users", { id: viewer.userId! }, { $set: { lang } }));
    } catch (err) {
      console.error("[lang] could not save preference to the account", err);
    }
  }

  // The language is read in the root layout, so every route's output changes.
  revalidatePath("/", "layout");
}
