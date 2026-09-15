"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
  The small pieces the editor screens share.

  Plainer than the learner UI on purpose: no shadows, no rounded cards inside
  rounded cards. This screen is a list of things to change, and every pixel
  spent making it pleasant is a pixel not spent making the thing being edited
  legible. The 44px tap floor is kept — it is as likely to be used standing in
  a room where filming is happening as at a desk.
*/

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</span>
      {children}
      {hint ? <span className="text-[0.78rem] leading-relaxed text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "min-h-[44px] w-full rounded-tile border border-line bg-paper px-3 text-[0.95rem] text-ink outline-none transition-colors focus:border-violet focus:ring-2 focus:ring-violet/25 placeholder:text-ink-3";

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

/** A save button that says what happened, and stays saying it long enough to read. */
export function SaveBar({
  busy,
  status,
  onSave,
  children,
}: {
  busy: boolean;
  status: string | null;
  onSave: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="min-h-[44px] rounded-pill bg-fill px-5 text-[0.9rem] font-semibold text-on-fill transition-opacity disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {children}
      {status ? <span className="text-[0.85rem] font-medium text-ink-2">{status}</span> : null}
    </div>
  );
}

/**
 * Anything that cannot be undone asks twice, in place.
 *
 * A confirm() dialog is easy to dismiss without reading and impossible to
 * style; a second tap on a button that has changed its own words is harder to
 * do by accident and says exactly what is about to happen.
 */
export function DangerButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={cn(
        "min-h-[44px] rounded-pill px-4 text-[0.86rem] font-semibold transition-colors",
        armed ? "bg-pink text-white" : "text-ink-3 underline underline-offset-4 hover:text-pink"
      )}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/** Turns an error code from a route into something a person can act on. */
export function explain(code: string | undefined): string {
  if (!code) return "That did not save. Try again.";
  const [name, detail] = code.split(":");
  switch (name) {
    case "free_limit":
      return `There are already ${detail} free lessons. Unset one before making another free.`;
    case "category_has_courses":
      return `${detail} course${detail === "1" ? "" : "s"} still sit in this category. Move them first.`;
    case "course_has_lessons":
      return `${detail} lesson${detail === "1" ? "" : "s"} still sit in this course. Delete them first.`;
    case "lesson_watched":
      return `${detail} learner${detail === "1" ? " has" : "s have"} watched this. Deleting it would rewrite their progress — do it in the database if you really mean to.`;
    case "unreadable_video":
      return "That is not a YouTube link we can read. Paste the address bar, or type TODO to fill it in later.";
    case "unknown_category":
      return "That category does not exist.";
    case "unknown_course":
      return "That course does not exist.";
    case "not_admin":
      return "Your session is no longer an admin session. Sign in again.";
    case "rate_limited":
      return "Too many changes too quickly. Wait a minute.";
    default:
      return "That did not save. Try again.";
  }
}
