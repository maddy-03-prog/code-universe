import { useState, useCallback, useRef } from "react";

interface AutoSaveOptions {
  onSave: (content: string) => Promise<void>;
  delay?: number;
}

export function useAutoSave({ onSave, delay = 1500 }: AutoSaveOptions) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (content: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");
      timerRef.current = setTimeout(async () => {
        try {
          await onSave(content);
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }, delay);
    },
    [onSave, delay]
  );

  return { save, status };
}

