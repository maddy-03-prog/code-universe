import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[var(--cu-border)] bg-[var(--cu-bg-elevated)] px-3 py-2 text-sm text-[var(--cu-text-primary)] placeholder:text-[var(--cu-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-blue)] disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }

