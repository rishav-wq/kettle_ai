"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post, send } from "@/lib/http";
import { cn } from "@/lib/cn";
import type { AdminCatalog, AdminCategory } from "@/lib/content/admin-queries";
import { DangerButton, Field, Row, SaveBar, explain, inputClass } from "./parts";

type CategoryDraft = {
  id: string;
  nameHi: string;
  nameEn: string;
  blurbHi: string;
  blurbEn: string;
  descriptionHi: string;
  descriptionEn: string;
  sortOrder: number;
};

const blankCategory = (sortOrder: number): CategoryDraft => ({
  id: "",
  nameHi: "",
  nameEn: "",
  blurbHi: "",
  blurbEn: "",
  descriptionHi: "",
  descriptionEn: "",
  sortOrder,
});

const toDraft = (c: AdminCategory): CategoryDraft => ({
  id: c.id,
  nameHi: c.nameHi,
  nameEn: c.nameEn,
  blurbHi: c.blurbHi ?? "",
  blurbEn: c.blurbEn ?? "",
  descriptionHi: c.descriptionHi ?? "",
  descriptionEn: c.descriptionEn ?? "",
  sortOrder: c.sortOrder,
});

/** A slug suggestion from the English name. The admin can still type their own. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function CatalogueEditor({ catalog, freeLimit }: { catalog: AdminCatalog; freeLimit: number }) {
  const router = useRouter();
  const { totals } = catalog;

  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const missingVideo = totals.lessons - totals.withVideo;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-[1.5rem] font-bold leading-tight">Catalogue</h1>

        {/*
          The numbers an editor needs before deciding what to do next: what is
          filmed, what is only written down, and whether the free four are
          actually four.
        */}
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Stat label="Categories" v={totals.categories} />
          <Stat label="Lessons" v={totals.lessons} sub={`${totals.published} live`} />
          <Stat label="With video" v={totals.withVideo} tone={missingVideo > 0 ? "warn" : undefined} />
          <Stat label="Free" v={`${totals.free}/${freeLimit}`} tone={totals.free === freeLimit ? undefined : "warn"} />
          <Stat label="Minutes" v={totals.minutes} />
        </dl>

        {totals.free !== freeLimit ? (
          <p className="rounded-tile border border-dashed border-line px-4 py-3 text-[0.88rem] leading-relaxed text-ink-3">
            The landing page, the paywall and the seed script all assume exactly {freeLimit} free lessons. There{" "}
            {totals.free === 1 ? "is" : "are"} {totals.free}.
          </p>
        ) : null}

        {missingVideo > 0 ? (
          <p className="rounded-tile border border-dashed border-line px-4 py-3 text-[0.88rem] leading-relaxed text-ink-3">
            {missingVideo} lesson{missingVideo === 1 ? "" : "s"} still point at TODO. Those play as &ldquo;video being added&rdquo;, and are counted
            nowhere a learner can see.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[1.1rem] font-bold">Categories</h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="ml-auto min-h-[40px] rounded-pill bg-fill px-4 text-[0.85rem] font-semibold text-on-fill"
          >
            {adding ? "Cancel" : "Add a category"}
          </button>
        </div>

        {adding ? (
          <CategoryForm
            draft={blankCategory((catalog.categories.at(-1)?.sortOrder ?? 0) + 1)}
            isNew
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        ) : null}

        <div className="flex flex-col gap-3">
          {catalog.categories.map((cat) => {
            const missing = cat.lessons.filter((l) => !l.hasVideo).length;
            const drafts = cat.lessons.filter((l) => !l.isPublished).length;
            return (
              <div key={cat.id} className="rounded-card border border-line bg-paper">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1rem] font-semibold">{cat.nameEn}</p>
                    <p className="truncate text-[0.82rem] text-ink-3">
                      {cat.nameHi} · <code className="font-mono">{cat.id}</code> · #{cat.sortOrder}
                    </p>
                  </div>
                  <span className="flex-none rounded-pill bg-wash px-3 py-1 text-[0.75rem] font-semibold text-ink-3">
                    {cat.lessons.length === 0
                      ? "Coming soon"
                      : `${cat.lessons.length} lesson${cat.lessons.length === 1 ? "" : "s"}${missing > 0 ? ` · ${missing} TODO` : ""}${
                          drafts > 0 ? ` · ${drafts} draft` : ""
                        }`}
                  </span>
                  <Link
                    href={`/admin/categories/${cat.id}`}
                    className="min-h-[40px] flex-none rounded-pill bg-fill px-4 py-2 text-[0.85rem] font-semibold text-on-fill"
                  >
                    Lessons ›
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(editing === cat.id ? null : cat.id)}
                    className="min-h-[40px] flex-none rounded-pill border border-line px-4 text-[0.85rem] font-semibold"
                  >
                    {editing === cat.id ? "Close" : "Edit"}
                  </button>
                </div>

                {editing === cat.id ? (
                  <div className="flex flex-col gap-3 border-t border-line p-4">
                    <CategoryForm
                      draft={toDraft(cat)}
                      onDone={() => {
                        setEditing(null);
                        router.refresh();
                      }}
                    />
                    {cat.lessons.length === 0 ? <DeleteCategory id={cat.id} onDone={() => router.refresh()} /> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, v, sub, tone }: { label: string; v: number | string; sub?: string; tone?: "warn" }) {
  return (
    <div className={cn("rounded-tile border px-3 py-2.5", tone === "warn" ? "border-violet bg-wash" : "border-line bg-paper")}>
      <dd className="text-[1.25rem] font-bold leading-none tabular-nums">{v}</dd>
      <dt className="mt-1 text-[0.72rem] font-medium text-ink-3">{label}</dt>
      {sub ? <p className="text-[0.7rem] text-ink-3">{sub}</p> : null}
    </div>
  );
}

function CategoryForm({ draft, isNew, onDone }: { draft: CategoryDraft; isNew?: boolean; onDone: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const set = <K extends keyof CategoryDraft>(k: K, v: CategoryDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setStatus(null);
    const res = await post<{ error?: string }>("/api/admin/categories", d);
    setBusy(false);
    if (!res.ok) return setStatus(explain(res.body?.error));
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-paper p-4">
      <Row>
        <Field label="Name (English)">
          <input
            className={inputClass}
            value={d.nameEn}
            onChange={(e) => {
              const nameEn = e.target.value;
              setD((p) => ({ ...p, nameEn, id: isNew && (p.id === "" || p.id === slugify(p.nameEn)) ? slugify(nameEn) : p.id }));
            }}
          />
        </Field>
        <Field label="Name (Hindi)">
          <input className={inputClass} value={d.nameHi} onChange={(e) => set("nameHi", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Blurb (English)" hint="Optional. One line beside the heading on the Learn page.">
          <input className={inputClass} value={d.blurbEn} onChange={(e) => set("blurbEn", e.target.value)} />
        </Field>
        <Field label="Blurb (Hindi)">
          <input className={inputClass} value={d.blurbHi} onChange={(e) => set("blurbHi", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Description (English)" hint="The longer text, at the top of the category's own page.">
          <textarea rows={3} className={cn(inputClass, "py-2")} value={d.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </Field>
        <Field label="Description (Hindi)">
          <textarea rows={3} className={cn(inputClass, "py-2")} value={d.descriptionHi} onChange={(e) => set("descriptionHi", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field
          label="Slug"
          hint={isNew ? "The permanent id. Lowercase, dashes." : "Changing this makes a new category rather than renaming this one."}
        >
          <input className={cn(inputClass, "font-mono")} value={d.id} onChange={(e) => set("id", slugify(e.target.value))} />
        </Field>
        <Field label="Order" hint="Low numbers first on the Learn page.">
          <input type="number" className={inputClass} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
      </Row>
      <SaveBar busy={busy} status={status} onSave={() => void save()} />
    </div>
  );
}

function DeleteCategory({ id, onDone }: { id: string; onDone: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DangerButton
        label="Delete category"
        confirmLabel="Tap again to delete"
        onConfirm={() => {
          void (async () => {
            const res = await send<{ error?: string }>("DELETE", "/api/admin/categories", { id });
            if (!res.ok) return setStatus(explain(res.body?.error));
            onDone();
          })();
        }}
      />
      {status ? <span className="text-[0.82rem] font-medium text-pink">{status}</span> : null}
    </div>
  );
}
