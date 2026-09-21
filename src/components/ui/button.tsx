import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "soft" | "ghost" | "onGrad";
type Size = "md" | "sm" | "lg";

/*
  Pills, not rectangles. Violet fill for the one action that matters on a
  screen, a tinted version for the second, and an outline for anything else.
  Nothing drops below 44px, which is the floor for this audience.
*/
const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-display font-semibold leading-tight transition-[transform,box-shadow,background-color] active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-fill text-on-fill shadow-m hover:shadow-l",
  soft: "bg-wash text-violet hover:bg-line",
  ghost: "border-2 border-line text-ink hover:border-violet hover:text-violet",
  onGrad: "bg-white text-violet shadow-m hover:bg-white/90",
};

const sizes: Record<Size, string> = {
  lg: "min-h-[58px] px-8 text-[1.05rem]",
  md: "min-h-[52px] px-7 text-[1rem]",
  sm: "min-h-[44px] px-5 text-[0.9rem]",
};

type Common = { variant?: Variant; size?: Size; full?: boolean; className?: string; children: ReactNode };
type ButtonProps = Common & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type LinkProps = Common & Omit<ComponentProps<typeof Link>, "className" | "children">;

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", full, className, children, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], full && "w-full", className);

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link className={classes} {...(rest as Omit<LinkProps, keyof Common>)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...(rest as Omit<ButtonProps, keyof Common>)}>
      {children}
    </button>
  );
}
