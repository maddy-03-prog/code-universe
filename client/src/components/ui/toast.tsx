import * as React from "react"
import * as ToastPrimitive from "@radix-ui/react-toast"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const ToastProvider = ToastPrimitive.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn("fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[360px] flex-col gap-2", className)}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: "default" | "success" | "error" }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-[var(--cu-border)] bg-[var(--cu-bg-elevated)]",
    success: "border-[var(--cu-green)]/40 bg-[var(--cu-green)]/10",
    error: "border-[var(--cu-red)]/40 bg-[var(--cu-red)]/10",
  }
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-5",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitive.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn("inline-flex h-8 items-center rounded border border-[var(--cu-border)] bg-transparent px-3 text-xs font-medium hover:bg-[var(--cu-bg-overlay)] focus:outline-none", className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn("absolute right-2 top-2 rounded p-1 text-[var(--cu-text-muted)] hover:text-[var(--cu-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity", className)}
    toast-close=""
    {...props}
  >
    <X className="h-3 w-3" />
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-medium text-[var(--cu-text-primary)]", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn("text-xs text-[var(--cu-text-muted)]", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

export { ToastProvider, ToastViewport, Toast, ToastAction, ToastClose, ToastTitle, ToastDescription }
export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

