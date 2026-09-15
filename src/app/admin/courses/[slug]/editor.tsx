"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post, send } from "@/lib/http";
import { cn } from "@/lib/cn";
import type { AdminCourse, AdminLesson } from "@/lib/content/admin-queries";
import { DangerButton, Field, Row, SaveBar, explain, inputClass } from "../../parts";

type Props = {
  course: AdminCourse;
  categories: { id: string; nameEn: string }[];
  freeUsed: number;
  freeLimit: number;
};

export function CourseEditor({ course, categories, freeUsed, freeLimit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-7">
      <CourseSettings course={course} categories={categories} onSaved={() => router.refresh()} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[1.1rem] font-bold">Lessons</h2>
          <span className="text-[0.84rem] text-ink-3">
            {freeUsed} of {freeLimit} free lessons used across the whole catalogue
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
          <LessonForm
            courseId={course.id}
            lesson={null}
            nextOrder={(course.lessons.at(-1)?.sortOrder ?? 0) + 1}
            freeFull={freeUsed >= freeLimit}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        ) : null}

        {course.lessons.length === 0 && !adding ? (
          <p className="rounded-tile border border-dashed border-line px-4 py-6 text-center text-[0.9rem] text-ink-3">
            No lessons yet. A course with none cannot be published.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {course.lessons.map((l) => (
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
                    courseId={course.id}
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

function CourseSettings({
  course,
  categories,
  onSaved,
}: {
  course: AdminCourse;
  categories: { id: string; nameEn: string }[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [d, setD] = useState({
    ...course,
    descriptionHi: course.descriptionHi ?? "",
    descriptionEn: course.descriptionEn ?? "",
    imageUrl: course.imageUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));

  const noLessons = course.lessons.length === 0;
  const noVideo = course.lessons.every((l) => !l.hasVideo);

  async function save(overrides?: Partial<typeof d>) {
    setBusy(true);
    setStatus(null);
    const body = { ...d, ...overrides };
    const res = await post<{ error?: string }>("/api/admin/courses", body);
    setBusy(false);
    if (!res.ok) return setStatus(explain(res.body?.error));
    setD(body);
    setStatus("Saved");
    onSaved();
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[1.4rem] font-bold leading-tight">{course.titleEn}</h1>
        <span
          className={cn(
            "rounded-pill px-3 py-1 text-[0.75rem] font-semibold",
            course.isPublished ? "bg-fill text-on-fill" : "bg-wash text-ink-3"
          )}
        >
          {course.isPublished ? "Live" : "Draft"}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-line bg-paper p-4">
        <Row>
          <Field label="Title (English)">
            <input className={inputClass} value={d.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
          </Field>
          <Field label="Title (Hindi)">
            <input className={inputClass} value={d.titleHi} onChange={(e) => set("titleHi", e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="Description (English)">
            <textarea rows={3} className={cn(inputClass, "py-2")} value={d.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
          </Field>
          <Field label="Description (Hindi)">
            <textarea rows={3} className={cn(inputClass, "py-2")} value={d.descriptionHi} onChange={(e) => set("descriptionHi", e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="Category">
            <select className={inputClass} value={d.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order" hint="Low numbers first within the category.">
            <input type="number" className={inputClass} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
          </Field>
        </Row>
        <Field label="Card image" hint="A path under /public, or blank for the placeholder art.">
          <input className={cn(inputClass, "font-mono")} value={d.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>

        <SaveBar busy={busy} status={status} onSave={() => void save()}>
          {/*
            Publishing is its own button rather than a checkbox above Save.
            Making a course visible to everyone is a different decision from
            correcting its description, and a checkbox makes the two feel the
            same. The refusals are stated rather than enforced by disabling:
            a dead button teaches nothing.
          */}
          <button
            type="button"
            disabled={busy || (!course.isPublished && (noLessons || noVideo))}
            onClick={() => void save({ isPublished: !d.isPublished })}
            className="min-h-[44px] rounded-pill border border-line px-5 text-[0.9rem] font-semibold transition-opacity disabled:opacity-40"
          >
            {d.isPublished ? "Unpublish" : "Publish"}
          </button>
          {!course.isPublished && noLessons ? <span className="text-[0.82rem] text-ink-3">Add a lesson first.</span> : null}
          {!course.isPublished && !noLessons && noVideo ? (
            <span className="text-[0.82rem] text-ink-3">Every lesson still says TODO. Add one real video first.</span>
          ) : null}
          {noLessons ? (
            <DeleteCourse
              id={course.id}
              onDone={() => {
                router.push("/admin");
                router.refresh();
              }}
            />
          ) : null}
        </SaveBar>
      </div>
    </section>
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
  isFree: boolean;
  sortOrder: number;
};

function LessonForm({
  courseId,
  lesson,
  nextOrder,
  freeFull,
  onDone,
}: {
  courseId: string;
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
    isFree: lesson?.isFree ?? false,
    sortOrder: lesson?.sortOrder ?? nextOrder,
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; title?: string; author?: string | null; thumbnail?: string | null; reason?: string } | null>(
    null
  );
  const set = <K extends keyof LessonDraft>(k: K, v: LessonDraft[K]) => setD((p) => ({ ...p, [k]: v }));

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

  async function save() {
    setBusy(true);
    setStatus(null);
    const res = await post<{ error?: string }>("/api/admin/lessons", {
      ...d,
      id: d.id || `${courseId}-${d.sortOrder}`,
      courseId,
    });
    setBusy(false);
    if (!res.ok) return setStatus(explain(res.body?.error));
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Field label="Title (English)">
          <input className={inputClass} value={d.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
        </Field>
        <Field label="Title (Hindi)">
          <input className={inputClass} value={d.titleHi} onChange={(e) => set("titleHi", e.target.value)} />
        </Field>
      </Row>

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
        <Field label="Length in seconds" hint="Read it off the player. YouTube does not give us this without an API key.">
          <input type="number" className={inputClass} value={d.durationSec} onChange={(e) => set("durationSec", Number(e.target.value))} />
        </Field>
        <Field label="Order">
          <input type="number" className={inputClass} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
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
        <Field label="Slug" hint="Leave blank to use the course slug and the order number.">
          <input className={cn(inputClass, "font-mono")} value={d.id} onChange={(e) => set("id", e.target.value)} placeholder={`${courseId}-${d.sortOrder}`} />
        </Field>
      ) : null}

      <SaveBar busy={busy} status={status} onSave={() => void save()}>
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

function DeleteCourse({ id, onDone }: { id: string; onDone: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <>
      <DangerButton
        label="Delete course"
        confirmLabel="Tap again to delete"
        onConfirm={() => {
          void (async () => {
            const res = await send<{ error?: string }>("DELETE", "/api/admin/courses", { id });
            if (!res.ok) return setStatus(explain(res.body?.error));
            onDone();
          })();
        }}
      />
      {status ? <span className="text-[0.82rem] font-medium text-pink">{status}</span> : null}
    </>
  );
}
