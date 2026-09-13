"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Prefs = { textsize?: "big"; theme?: "dark" | "light" };

/*
  Reading comfort.

  Two controls now that the interface is English only: text size and night
  mode. For an audience over 40 on a small bright screen these are controls
  rather than settings, so they live where they can be reached, not buried.
*/

const KEY = "kettle.prefs";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
const getServerSnapshot = () => "{}";

function parse(raw: string): Prefs {
  try {
    return JSON.parse(raw) as Prefs;
  } catch {
    return {};
  }
}

function write(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
  const r = document.documentElement;
  if (p.textsize === "big") r.setAttribute("data-textsize", "big");
  else r.removeAttribute("data-textsize");
  if (p.theme) r.setAttribute("data-theme", p.theme);
  else r.removeAttribute("data-theme");
  listeners.forEach((l) => l());
}

export function ComfortChips({ className, onGrad }: { className?: string; onGrad?: boolean }) {
  const prefs = parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
  const big = prefs.textsize === "big";
  const dark = prefs.theme === "dark";
  const update = (patch: Prefs) => write({ ...prefs, ...patch });

  return (
    <div className={cn("flex gap-2", className)} role="group" aria-label="Reading comfort">
      <Chip on={big} onGrad={onGrad} onClick={() => update({ textsize: big ? undefined : "big" })} label="Bigger text" />
      <Chip on={dark} onGrad={onGrad} onClick={() => update({ theme: dark ? undefined : "dark" })} label={dark ? "Day" : "Night"} />
    </div>
  );
}

function Chip({ on, onClick, label, onGrad }: { on: boolean; onClick: () => void; label: string; onGrad?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-[44px] flex-1 rounded-pill px-4 text-[0.85rem] font-semibold transition-colors",
        onGrad
          ? on
            ? "bg-white text-violet"
            : "bg-white/18 text-white hover:bg-white/28"
          : on
            ? "bg-fill text-on-fill"
            : "bg-wash text-ink-2 hover:text-violet"
      )}
    >
      {label}
    </button>
  );
}
