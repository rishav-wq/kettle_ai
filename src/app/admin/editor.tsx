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
  sortOrder: number;
};

const blankCategory = (sortOrder: number): CategoryDraft => ({
  id: "",
  nameHi: "",
  nameEn: "",
  blurbHi: "",
  blurbEn: "",
  sortOrder,
});

const toDraft = (c: AdminCategory): CategoryDraft => ({
  id: c.id,
  nameHi: c.nameHi,
  nameEn: c.nameEn,
  blurbHi: c.blurbHi ?? "",
  blurbEn: c.blurbEn ?? "",
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
  const [addingCourseIn, setAddingCourseIn] = useState<string | null>(null);

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
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Stat label="Categories" v={totals.categories} />
          <Stat label="Courses" v={totals.courses} sub={`${totals.published} live`} />
          <Stat label="Lessons" v={totals.lessons} />
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
          <h2 className="text-[1.1rem] font-bold">Categories and courses</h2>
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
          {catalog.categories.map((cat) => (
            <div key={cat.id} className="rounded-card border border-line bg-paper">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1rem] font-semibold">{cat.nameEn}</p>
                  <p className="truncate text-[0.82rem] text-ink-3">
                    {cat.nameHi} · <code className="font-mono">{cat.id}</code> · #{cat.sortOrder}
                  </p>
                </div>
                <span className="flex-none rounded-pill bg-wash px-3 py-1 text-[0.75rem] font-semibold text-ink-3">
                  {cat.courses.length === 0 ? "Coming soon" : `${cat.courses.length} course${cat.courses.length === 1 ? "" : "s"}`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(editing === cat.id ? null : cat.id)}
                  className="min-h-[40px] flex-none rounded-pill border border-line px-4 text-[0.85rem] font-semibold"
                >
                  {editing === cat.id ? "Close" : "Edit"}
                </button>
              </div>

              {editing === cat.id ? (
                <div className="border-t border-line p-4">
                  <CategoryForm
                    draft={toDraft(cat)}
                    onDone={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-line p-4">
                {cat.courses.map((c) => {
                  const missing = c.lessons.filter((l) => !l.hasVideo).length;
                  return (
                    <Link
                      key={c.id}
                      href={`/admin/courses/${c.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-tile border border-line px-3 py-2.5 transition-colors hover:border-violet"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] font-semibold">{c.titleEn}</span>
                        <span className="block truncate text-[0.8rem] text-ink-3">
                          {c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"}
                          {missing > 0 ? ` · ${missing} without video` : ""}
                          {c.lessons.some((l) => l.isFree) ? " · has free" : ""}
                        </span>
                      </span>
                      {!c.isPublished ? (
                        <span className="flex-none rounded-pill bg-wash px-2.5 py-1 text-[0.72rem] font-semibold text-ink-3">Draft</span>
                      ) : null}
                      <span aria-hidden className="flex-none text-ink-3">
                        ›
                      </span>
                    </Link>
                  );
                })}

                {addingCourseIn === cat.id ? (
                  <NewCourseForm
                    categoryId={cat.id}
                    sortOrder={(cat.courses.at(-1)?.sortOrder ?? 0) + 1}
                    onDone={(id) => {
                      setAddingCourseIn(null);
                      router.push(`/admin/courses/${id}`);
                    }}
                    onCancel={() => setAddingCourseIn(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAddingCourseIn(cat.id)}
                      className="min-h-[40px] rounded-pill border border-dashed border-line px-4 text-[0.85rem] font-semibold text-ink-2"
                    >
                      Add a course here
                    </button>
                    {cat.courses.length === 0 ? <DeleteCategory id={cat.id} onDone={() => router.refresh()} /> : null}
                  </div>
                )}
              </div>
            </div>
          ))}
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
        <Field label="Blurb (English)" hint="Optional. One line under the heading, for a category that needs explaining.">
          <input className={inputClass} value={d.blurbEn} onChange={(e) => set("blurbEn", e.target.value)} />
        </Field>
        <Field label="Blurb (Hindi)">
          <input className={inputClass} value={d.blurbHi} onChange={(e) => set("blurbHi", e.target.value)} />
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

function NewCourseForm({
  categoryId,
  sortOrder,
  onDone,
  onCancel,
}: {
  categoryId: string;
  sortOrder: number;
  onDone: (id: string) => void;
  onCancel: () => void;
}) {
  const [titleEn, setTitleEn] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    const body = {
      id: id || slugify(titleEn),
      categoryId,
      titleEn,
      titleHi,
      sortOrder,
      /*
        New courses start as drafts. A course with no lessons in it should not
        be reachable from the Learn page while it is still being written.
      */
      isPublished: false,
    };
    const res = await post<{ error?: string; id?: string }>("/api/admin/courses", body);
    setBusy(false);
    if (!res.ok) return setStatus(explain(res.body?.error));
    onDone(body.id);
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile border border-line bg-wash p-3">
      <Row>
        <Field label="Course title (English)">
          <input
            className={inputClass}
            value={titleEn}
            onChange={(e) => {
              const next = e.target.value;
              if (id === "" || id === slugify(titleEn)) setId(slugify(next));
              setTitleEn(next);
            }}
          />
        </Field>
        <Field label="Course title (Hindi)">
          <input className={inputClass} value={titleHi} onChange={(e) => setTitleHi(e.target.value)} />
        </Field>
      </Row>
      <Field label="Slug">
        <input className={cn(inputClass, "font-mono")} value={id} onChange={(e) => setId(slugify(e.target.value))} />
      </Field>
      <SaveBar busy={busy} status={status} onSave={() => void save()}>
        <button type="button" onClick={onCancel} className="min-h-[44px] text-[0.86rem] font-semibold text-ink-3 underline underline-offset-4">
          Cancel
        </button>
        <span className="text-[0.82rem] text-ink-3">Starts as a draft.</span>
      </SaveBar>
    </div>
  );
}

function DeleteCategory({ id, onDone }: { id: string; onDone: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <>
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
    </>
  );
}
