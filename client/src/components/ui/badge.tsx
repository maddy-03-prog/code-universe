import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "blue" | "violet"
}>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[var(--cu-blue)]/20 text-[var(--cu-blue)] border-[var(--cu-blue)]/30",
    secondary: "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-secondary)] border-[var(--cu-border)]",
    outline: "bg-transparent text-[var(--cu-text-secondary)] border-[var(--cu-border)]",
    success: "bg-[var(--cu-green)]/20 text-[var(--cu-green)] border-[var(--cu-green)]/30",
    warning: "bg-[var(--cu-amber)]/20 text-[var(--cu-amber)] border-[var(--cu-amber)]/30",
    danger: "bg-[var(--cu-red)]/20 text-[var(--cu-red)] border-[var(--cu-red)]/30",
    blue: "bg-[var(--cu-blue)]/20 text-[var(--cu-blue)] border-[var(--cu-blue)]/30",
    violet: "bg-[var(--cu-violet)]/20 text-[var(--cu-violet)] border-[var(--cu-violet)]/30",
  }
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium font-mono",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }

