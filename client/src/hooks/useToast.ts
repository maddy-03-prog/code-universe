import { useState, useCallback } from "react"

type ToastVariant = "default" | "success" | "error"
interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

let toastFn: ((t: Omit<ToastItem, "id">) => void) | null = null

export function registerToastFn(fn: typeof toastFn) {
  toastFn = fn
}

export function toast(options: Omit<ToastItem, "id">) {
  toastFn?.(options)
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const addToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])
  return { toasts, toast: addToast }
}

