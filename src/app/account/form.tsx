"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ComfortChips, Sheet } from "@/components/ui";
import { LanguageToggle } from "@/components/language-toggle";
import type { Lang } from "@/lib/lang";
import { post, send } from "@/lib/http";
import { T } from "@/components/bilingual";
import { useLang } from "@/components/lang-provider";
import { pick } from "@/lib/pick";

type Props = {
  name: string;
  phone: string;
  city: string;
  lang: Lang;
};

export function AccountForm({ name: initialName, phone, city: initialCity, lang }: Props) {
  const router = useRouter();
  const ui = useLang();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

  /*
    Save is dead until something has actually changed.

    A live button on an untouched form invites a tap that does nothing, and
    then the person cannot tell whether the page is working. Comparing against
    the values the server sent also means an edit typed and then undone leaves
    the button dead again, which is the honest answer.
  */
  const dirty = name.trim() !== initialName.trim() || city.trim() !== initialCity.trim();

  async function save() {
    setBusy(true);
    const res = await send("PATCH", "/api/account", { name: name.trim(), city: city.trim() || null });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    }
  }

  async function signOut() {
    await post("/api/auth/signout");
    router.replace("/");
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await send("DELETE", "/api/account");
    setBusy(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-9">
      <section className="flex flex-col gap-4">
        <h2 className="text-[1.05rem] font-bold">
          <T hi="आपकी जानकारी" en="Your details" />
        </h2>

        <Field label={<T hi="नाम" en="Name" />}>
          <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px] w-full bg-transparent text-[1rem] font-medium outline-none" />
        </Field>

        <Field label={<T hi="शहर, अगर आप बताना चाहें" en="City, if you would like to share it" />}>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={pick(ui, "ज़रूरी नहीं", "Optional")}
            className="min-h-[44px] w-full bg-transparent text-[1rem] font-medium outline-none placeholder:text-ink-3"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[0.82rem] font-medium text-ink-3">
            <T hi="मोबाइल नंबर" en="Mobile number" />
          </span>
          <p className="flex min-h-[60px] items-center rounded-tile border border-line bg-wash px-4 text-[1rem] font-semibold tabular-nums text-ink-3">
            {phone}
          </p>
          <p className="text-[0.82rem] leading-relaxed text-ink-3">
            <T hi="नंबर बदलने के लिए मदद पेज पर हमसे कहिए।" en="To change your number, ask us on the help page." />
          </p>
        </div>

        {/* Muted until there is something to save. See `dirty` above. */}
        <Button full disabled={busy || !dirty} onClick={() => void save()}>
          {saved ? <T hi="सहेज लिया" en="Saved" /> : <T hi="बदलाव सहेजिए" en="Save changes" />}
        </Button>
      </section>

      {/*
        Language sits on its own rather than inside "Your details", because it
        takes effect on tap instead of on Save. Mixing a control that applies
        itself in with controls that wait for a button is how a form teaches
        someone that Save does not matter.
      */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem] font-bold">
          <T hi="भाषा" en="Language" />
        </h2>
        <p className="text-[0.88rem] leading-relaxed text-ink-3">
          <T
            hi="वीडियो दोनों हालत में हिंदी में ही हैं। इससे स्क्रीन पर लिखा हुआ बदलता है, और यह तुरंत लागू हो जाता है।"
            en="Videos are in Hindi either way. This changes the writing on screen, and applies straight away."
          />
        </p>
        <LanguageToggle current={lang} className="self-start" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem] font-bold">
          <T hi="पढ़ने की सुविधा" en="Reading comfort" />
        </h2>
        <p className="text-[0.88rem] leading-relaxed text-ink-3">
          <T hi="बड़े अक्षर, या रात में पढ़ने के लिए गहरी स्क्रीन।" en="Bigger text, or a dark screen for reading at night." />
        </p>
        <ComfortChips />
      </section>

      <section className="flex flex-col gap-3">
        <Button full variant="soft" onClick={() => void signOut()}>
          <T hi="साइन आउट कीजिए" en="Sign out" />
        </Button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="min-h-[44px] text-[0.9rem] font-medium text-ink-3 underline underline-offset-4 hover:text-pink"
        >
          <T hi="मेरा खाता हमेशा के लिए मिटा दीजिए" en="Delete my account permanently" />
        </button>
      </section>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={pick(ui, "खाता मिटाइए", "Delete account")}>
        <h2 className="text-[1.3rem] font-bold">
          <T hi="क्या आपका खाता मिटा दें?" en="Delete your account?" />
        </h2>
        <p className="leading-relaxed text-ink-2">
          <T
            hi="आपका नाम, नंबर और सारी प्रगति मिट जाएगी। यह वापस नहीं किया जा सकता। बची हुई सदस्यता भी इसी के साथ चली जाएगी।"
            en="Your name, number and all progress will be erased. This cannot be undone. Any remaining membership goes with it."
          />
        </p>
        <label className="flex flex-col gap-2">
          <span className="text-[0.82rem] font-medium text-ink-3">
            <T hi="पक्का करने के लिए DELETE लिखिए" en="Type DELETE to confirm" />
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="min-h-[56px] rounded-tile border border-line bg-wash px-4 text-[1rem] font-semibold tracking-[0.1em] outline-none focus:ring-2 focus:ring-violet"
          />
        </label>
        <Button full disabled={typed !== "DELETE" || busy} onClick={() => void remove()}>
          <T hi="हाँ, मेरा खाता मिटा दीजिए" en="Yes, delete my account" />
        </Button>
        <Button full variant="soft" onClick={() => setConfirmDelete(false)}>
          <T hi="मेरा खाता रहने दीजिए" en="Keep my account" />
        </Button>
      </Sheet>
    </div>
  );
}

/*
  A visible edge on every input.

  A shadow alone reads as a raised card, not as somewhere to type — and on a
  cheap phone in daylight it disappears entirely. The border is what says
  "field"; the shadow is only depth.
*/
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.82rem] font-medium text-ink-3">{label}</span>
      <span className="flex min-h-[60px] items-center gap-3 rounded-tile border border-line bg-paper px-4 shadow-s focus-within:border-violet focus-within:ring-2 focus-within:ring-violet">
        {children}
      </span>
    </label>
  );
}
