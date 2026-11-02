import { useToast, registerToastFn } from "@/hooks/useToast"
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from "./toast"
import { CheckCircle, XCircle, Info } from "lucide-react"
import { useEffect } from "react"

export function Toaster() {
  const { toasts, toast } = useToast()
  useEffect(() => { registerToastFn(toast) }, [toast])

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div className="flex items-start gap-3">
            {t.variant === "success" && <CheckCircle className="h-4 w-4 text-[var(--cu-green)] shrink-0 mt-0.5" />}
            {t.variant === "error" && <XCircle className="h-4 w-4 text-[var(--cu-red)] shrink-0 mt-0.5" />}
            {(!t.variant || t.variant === "default") && <Info className="h-4 w-4 text-[var(--cu-blue)] shrink-0 mt-0.5" />}
            <div>
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

