import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "lecture" | "seminar" | "lab" | "success" | "danger";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
  lecture: "border-zinc-900 bg-zinc-950 text-white",
  seminar: "border-teal-700 bg-teal-700 text-white",
  lab: "border-indigo-700 bg-indigo-700 text-white",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700"
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        "rounded-md transition-colors duration-200",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
