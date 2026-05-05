import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "border-zinc-950 bg-zinc-950 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-red-600 hover:border-red-600",
  secondary: "border-zinc-200 bg-white text-zinc-950 hover:border-red-500/40 hover:bg-red-500/10",
  outline: "border-zinc-300 bg-transparent text-zinc-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-zinc-950",
  ghost: "border-transparent bg-transparent text-zinc-600 hover:bg-red-500/10 hover:text-zinc-950",
  danger: "border-red-600 bg-red-600 text-white hover:bg-red-700"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm border font-medium tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "rounded-md",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
