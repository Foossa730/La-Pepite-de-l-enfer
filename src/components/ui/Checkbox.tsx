import * as React from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
};

export function Checkbox({ label, className = "", ...props }: Props) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-2xl border border-lbc-navy/10 bg-white/55 p-3 shadow-sm transition hover:bg-white/70",
        className
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[rgb(var(--lbc-orange))]"
        {...props}
      />
      <span className="text-sm leading-5 text-lbc-navy">{label}</span>
    </label>
  );
}
