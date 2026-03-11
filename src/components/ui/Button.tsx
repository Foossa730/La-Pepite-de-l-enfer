import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const base =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition will-change-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<NonNullable<Props["variant"]>, string> = {
  primary:
    "border-transparent bg-gradient-to-b from-[rgb(var(--lbc-orange))] to-orange-600 text-white shadow-[0_18px_40px_rgba(10,21,45,0.18),0_14px_30px_rgba(255,92,0,0.18)] hover:-translate-y-[1px] hover:brightness-[1.01] active:translate-y-0",
  ghost:
    "border-lbc-navy/15 bg-white/55 text-lbc-navy shadow-sm hover:bg-white/70 hover:border-lbc-navy/20",
  danger:
    "border-transparent bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_16px_36px_rgba(10,21,45,0.18)] hover:-translate-y-[1px] active:translate-y-0"
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10",
  lg: "h-12 px-5 text-base"
};

export function Button({ className = "", variant = "primary", size = "md", ...props }: Props) {
  return <button className={[base, variants[variant], sizes[size], className].join(" ")} {...props} />;
}
