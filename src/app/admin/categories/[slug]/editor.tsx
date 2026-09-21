"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post, send } from "@/lib/http";
import { cn } from "@/lib/cn";
import type { AdminCategory, AdminLesson } from "@/lib/content/admin-queries";
import { DangerButton, Field, Row, SaveBar, explain, inputClass } from "../../parts";

/*
  One category and its lessons.

  This is what the course editor used to be. Courses were flattened away, so a
  lesson is added straight into a category and the video link is the first
  thing on the form — which is the actual job this screen exists for.
*/
export function CategoryEditor({
  category,
  freeUsed,
  freeLimit,
}: {
  category: AdminCategory;
  freeUsed: number;
  freeLimit: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const missing = category.lessons.filter((l) => !l.hasVideo).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[1.4rem] font-bold leading-tight">{category.nameEn}</h1>
        <span className="text-[0.85rem] text-ink-3">{category.nameHi}</span>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[1.05rem] font-bold">Lessons</h2>
          <span className="text-[0.84rem] text-ink-3">
            {freeUsed} of {freeLimit} free used across the catalogue
            {missing > 0 ? ` · ${missing} here without video` : ""}
          </span>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="ml-auto min-h-[40px] rounded-pill bg-fill px-4 text-[0.85rem] font-semibold text-on-fill"
          >
            {adding ? "Cancel" : "Add a lesson"}
          </button>
        </div>

        {adding ? (
          <div className="rounded-card border border-line bg-paper p-4">
            <LessonForm
              categoryId={category.id}
              lesson={null}
              nextOrder={(category.lessons.at(-1)?.sortOrder ?? 0) + 1}
              freeFull={freeUsed >= freeLimit}
              onDone={() => {
                setAdding(false);
                router.refresh();
              }}
            />
          </div>
        ) : null}

        {category.lessons.length === 0 && !adding ? (
          <p className="rounded-tile border border-dashed border-line px-4 py-6 text-center text-[0.9rem] text-ink-3">
            Nothing here yet. This category shows as &ldquo;coming soon&rdquo; on the Learn page.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {category.lessons.map((l) => (
            <div key={l.id} className="rounded-card border border-line bg-paper">
              <div className="flex flex-wrap items-center gap-3 p-3.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[12px] bg-wash text-[0.85rem] font-bold tabular-nums text-violet">
                  {l.sortOrder}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-semibold">{l.titleEn}</span>
                  <span className="block truncate text-[0.8rem] text-ink-3">
                    {l.hasVideo ? (
                      <>
                        <code className="font-mono">{l.providerRef}</code> · {Math.round(l.durationSec / 60)} min
                      </>
                    ) : (
                      "No video yet"
                    )}
                  </span>
                </span>
                {l.isFree ? (
                  <span className="flex-none rounded-pill bg-fill px-2.5 py-1 text-[0.72rem] font-semibold text-on-fill">Free</span>
                ) : null}
                {!l.isPublished ? (
                  <span className="flex-none rounded-pill bg-wash px-2.5 py-1 text-[0.72rem] font-semibold text-ink-3">Draft</span>
                ) : null}
                {!l.hasVideo ? (
                  <span className="flex-none rounded-pill border border-dashed border-line px-2.5 py-1 text-[0.72rem] font-semibold text-ink-3">
                    TODO
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(open === l.id ? null : l.id)}
                  className="min-h-[40px] flex-none rounded-pill border border-line px-4 text-[0.85rem] font-semibold"
                >
                  {open === l.id ? "Close" : "Edit"}
                </button>
              </div>

              {open === l.id ? (
                <div className="border-t border-line p-4">
                  <LessonForm
                    categoryId={category.id}
                    lesson={l}
                    nextOrder={l.sortOrder}
                    freeFull={freeUsed >= freeLimit && !l.isFree}
                    onDone={() => {
                      setOpen(null);
                      router.refresh();
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type LessonDraft = {
  id: string;
  titleHi: string;
  titleEn: string;
  video: string;
  durationSec: number;
  transcriptHi: string;
  transcriptEn: string;
  imageUrl: string;
  isFree: boolean;
  isPublished: boolean;
  orientation: "landscape" | "portrait";
  sortOrder: number;
};

function LessonForm({
  categoryId,
  lesson,
  nextOrder,
  freeFull,
  onDone,
}: {
  categoryId: string;
  lesson: AdminLesson | null;
  nextOrder: number;
  freeFull: boolean;
  onDone: () => void;
}) {
  const [d, setD] = useState<LessonDraft>({
    id: lesson?.id ?? "",
    titleHi: lesson?.titleHi ?? "",
    titleEn: lesson?.titleEn ?? "",
    video: lesson?.providerRef ?? "",
    durationSec: lesson?.durationSec ?? 0,
    transcriptHi: lesson?.transcriptHi ?? "",
    transcriptEn: lesson?.transcriptEn ?? "",
    imageUrl: lesson?.imageUrl ?? "",
    orientation: lesson?.orientation ?? "portrait",
    isFree: lesson?.isFree ?? false,
    isPublished: lesson?.isPublished ?? false,
    sortOrder: lesson?.sortOrder ?? nextOrder,
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; title?: string; author?: string | null; thumbnail?: string | null; reason?: string } | null>(
    null
  );
  const set = <K extends keyof LessonDraft>(k: K, v: LessonDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const hasRealVideo = Boolean(d.video.trim()) && !d.video.trim().startsWith("TODO");

  /*
    Confirming the link runs when the field loses focus, not on every
    keystroke: each check is a call out to YouTube. It never blocks the save —
    the answer is for the person, who can see the title and tell whether it is
    the video they meant.
  */
  async function confirmVideo() {
    const v = d.video.trim();
    if (!v || v.startsWith("TODO")) return setCheck(null);
    const res = await post<{ ok: boolean; title?: string; author?: string | null; thumbnail?: string | null; reason?: string }>(
      "/api/admin/video",
      { video: v }
    );
    setCheck(res.ok ? res.body : { ok: false, reason: "unreachable" });
  }

  async function save(overrides?: Partial<LessonDraft>) {
    setBusy(true);
    setStatus(null);
    const body = { ...d, ...overrides, id: d.id || `${categoryId}-${d.sortOrder}`, categoryId };
    const res = await post<{ error?: string }>("/api/admin/lessons", body);
    setBusy(false);
    if (!res.ok) return setStatus(explain(res.body?.error));
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Video" hint="Paste the YouTube address bar, any shape. Only the 11-character id is stored. Type TODO to fill it in later.">
        <input
          className={cn(inputClass, "font-mono")}
          value={d.video}
          onChange={(e) => set("video", e.target.value)}
          onBlur={() => void confirmVideo()}
          placeholder="https://youtu.be/… or TODO"
        />
      </Field>

      {check ? (
        check.ok ? (
          <div className="flex items-center gap-3 rounded-tile border border-line bg-wash p-2.5">
            {check.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={check.thumbnail} alt="" width={96} height={54} className="h-[54px] w-[96px] flex-none rounded object-cover" />
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-[0.9rem] font-semibold">{check.title}</span>
              <span className="block truncate text-[0.8rem] text-ink-3">{check.author ?? "Found on YouTube"}</span>
            </span>
          </div>
        ) : (
          <p className="rounded-tile bg-pink/10 px-3 py-2 text-[0.85rem] font-medium text-pink">
            {check.reason === "unreadable"
              ? "Cannot read a YouTube id from that."
              : check.reason === "not_embeddable"
                ? "YouTube will not embed that one — it may be private, deleted, or have embedding turned off."
                : "Could not reach YouTube to check. The link may still be fine."}
          </p>
        )
      ) : null}

      <Row>
        <Field label="Title (English)">
          <input className={inputClass} value={d.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
        </Field>
        <Field label="Title (Hindi)">
          <input className={inputClass} value={d.titleHi} onChange={(e) => set("titleHi", e.target.value)} />
        </Field>
      </Row>

      <Row>
        <Field label="Length in seconds" hint="Read it off the player. YouTube does not give us this without an API key.">
          <input type="number" className={inputClass} value={d.durationSec} onChange={(e) => set("durationSec", Number(e.target.value))} />
        </Field>
        <Field
          label="Shape"
          hint="Filmed on a phone held upright is Portrait. Get this wrong and the video sits in a letterbox with black down both sides."
        >
          <select
            className={inputClass}
            value={d.orientation}
            onChange={(e) => set("orientation", e.target.value as "landscape" | "portrait")}
          >
            <option value="portrait">Portrait — tall, filmed on a phone</option>
            <option value="landscape">Landscape — wide, 16:9</option>
          </select>
        </Field>
      </Row>

      <Row>
        <Field label="Order" hint="Low numbers first within the category.">
          <input type="number" className={inputClass} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
        <Field label="Card image" hint="Usually blank — the YouTube thumbnail is used. This is the override, and the art while the video is TODO.">
          <input className={cn(inputClass, "font-mono")} value={d.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
      </Row>

      <Row>
        <Field label="Transcript (English)" hint="Written by hand. Automatic captioning fails on code-switched speech.">
          <textarea rows={4} className={cn(inputClass, "py-2")} value={d.transcriptEn} onChange={(e) => set("transcriptEn", e.target.value)} />
        </Field>
        <Field label="Transcript (Hindi)">
          <textarea rows={4} className={cn(inputClass, "py-2")} value={d.transcriptHi} onChange={(e) => set("transcriptHi", e.target.value)} />
        </Field>
      </Row>

      <label className="flex items-start gap-3 rounded-tile border border-line p-3">
        <input
          type="checkbox"
          checked={d.isFree}
          disabled={freeFull && !d.isFree}
          onChange={(e) => set("isFree", e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none accent-[var(--violet)]"
        />
        <span className="text-[0.88rem] leading-snug text-ink-2">
          One of the free lessons.
          {freeFull && !d.isFree ? " All four are taken — unset one elsewhere first." : ""}
        </span>
      </label>

      {!lesson ? (
        <Field label="Slug" hint="Leave blank to use the category slug and the order number.">
          <input
            className={cn(inputClass, "font-mono")}
            value={d.id}
            onChange={(e) => set("id", e.target.value)}
            placeholder={`${categoryId}-${d.sortOrder}`}
          />
        </Field>
      ) : null}

      <SaveBar busy={busy} status={status} onSave={() => void save()}>
        {/*
          Publishing is its own button rather than a checkbox above Save.
          Making a lesson visible to everyone is a different decision from
          correcting its title, and a checkbox makes the two feel the same.
        */}
        <button
          type="button"
          disabled={busy || (!d.isPublished && !hasRealVideo)}
          onClick={() => void save({ isPublished: !d.isPublished })}
          className="min-h-[44px] rounded-pill border border-line px-5 text-[0.9rem] font-semibold transition-opacity disabled:opacity-40"
        >
          {d.isPublished ? "Unpublish" : "Publish"}
        </button>
        {!d.isPublished && !hasRealVideo ? <span className="text-[0.82rem] text-ink-3">Add a real video link first.</span> : null}
        {lesson ? <DeleteLesson id={lesson.id} onDone={onDone} /> : null}
      </SaveBar>
    </div>
  );
}

function DeleteLesson({ id, onDone }: { id: string; onDone: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <>
      <DangerButton
        label="Delete lesson"
        confirmLabel="Tap again to delete"
        onConfirm={() => {
          void (async () => {
            const res = await send<{ error?: string }>("DELETE", "/api/admin/lessons", { id });
            if (!res.ok) return setStatus(explain(res.body?.error));
            onDone();
          })();
        }}
      />
      {status ? <span className="text-[0.82rem] font-medium text-pink">{status}</span> : null}
    </>
  );
}
