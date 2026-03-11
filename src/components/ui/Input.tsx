import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={[
        "focus-ring h-10 w-full rounded-2xl border border-lbc-navy/15 bg-white/75 px-3 text-sm text-lbc-navy shadow-sm placeholder:text-lbc-navy/45 transition hover:bg-white/85",
        className
      ].join(" ")}
      {...props}
    />
  );
}
