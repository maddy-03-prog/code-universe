import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "link"
    size?: "sm" | "default" | "lg" | "icon"
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  const variants = {
    default: "bg-[var(--cu-blue)] text-white hover:bg-[var(--cu-blue)]/90 shadow-sm",
    secondary: "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)] border border-[var(--cu-border)] hover:bg-[var(--cu-bg-overlay)]",
    ghost: "hover:bg-[var(--cu-bg-elevated)] text-[var(--cu-text-secondary)] hover:text-[var(--cu-text-primary)]",
    outline: "border border-[var(--cu-border)] bg-transparent hover:bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    link: "text-[var(--cu-blue)] underline-offset-4 hover:underline p-0 h-auto",
  }
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-7 px-3 text-xs",
    lg: "h-10 px-6",
    icon: "h-8 w-8",
  }
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }

