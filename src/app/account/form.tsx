"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ComfortChips, Sheet } from "@/components/ui";
import { post, send } from "@/lib/http";

type Props = {
  name: string;
  phone: string;
  city: string;
  whatsappOptIn: boolean;
};

export function AccountForm({ name: initialName, phone, city: initialCity, whatsappOptIn: initialOptIn }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [optIn, setOptIn] = useState(initialOptIn);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

  async function save() {
    setBusy(true);
    const res = await send("PATCH", "/api/account", { name: name.trim(), city: city.trim() || null, whatsappOptIn: optIn });
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
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem] font-bold">Your details</h2>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px] w-full bg-transparent text-[1rem] font-medium outline-none" />
        </Field>

        <Field label="City, if you would like to share it">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Optional"
            className="min-h-[44px] w-full bg-transparent text-[1rem] font-medium outline-none placeholder:text-ink-3"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[0.82rem] font-medium text-ink-3">Mobile number</span>
          <p className="flex min-h-[60px] items-center rounded-tile bg-wash px-4 text-[1rem] font-semibold tabular-nums text-ink-3">{phone}</p>
          <p className="text-[0.82rem] text-ink-3">To change your number, ask us on the help page.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-tile bg-paper p-4 shadow-s">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 h-6 w-6 flex-none accent-[var(--violet)]" />
          <span className="text-[0.92rem] leading-snug text-ink-2">Remind me on WhatsApp</span>
        </label>

        <Button full disabled={busy} onClick={() => void save()}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem] font-bold">Reading comfort</h2>
        <ComfortChips />
      </section>

      <section className="flex flex-col gap-2.5">
        <Button full variant="soft" onClick={() => void signOut()}>
          Sign out
        </Button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="min-h-[44px] text-[0.9rem] font-medium text-ink-3 underline underline-offset-4 hover:text-pink"
        >
          Delete my account permanently
        </button>
      </section>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account">
        <h2 className="text-[1.3rem] font-bold">Delete your account?</h2>
        <p className="leading-relaxed text-ink-2">
          Your name, number and all progress will be erased. This cannot be undone. Any remaining membership goes with it.
        </p>
        <label className="flex flex-col gap-2">
          <span className="text-[0.82rem] font-medium text-ink-3">Type DELETE to confirm</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="min-h-[56px] rounded-tile bg-wash px-4 text-[1rem] font-semibold tracking-[0.1em] outline-none focus:ring-2 focus:ring-violet"
          />
        </label>
        <Button full disabled={typed !== "DELETE" || busy} onClick={() => void remove()}>
          Yes, delete my account
        </Button>
        <Button full variant="soft" onClick={() => setConfirmDelete(false)}>
          Keep my account
        </Button>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.82rem] font-medium text-ink-3">{label}</span>
      <span className="flex min-h-[60px] items-center gap-3 rounded-tile bg-paper px-4 shadow-s focus-within:ring-2 focus-within:ring-violet">{children}</span>
    </label>
  );
}
