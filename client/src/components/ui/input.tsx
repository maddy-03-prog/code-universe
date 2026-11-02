import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] px-3 py-1 text-sm text-[var(--cu-text-primary)] placeholder:text-[var(--cu-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-blue)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }

