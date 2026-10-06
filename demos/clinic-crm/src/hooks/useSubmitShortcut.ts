import { useEffect } from "react";

interface Params {
  enabled: boolean;
  onSubmit: () => void;
}

export function useSubmitShortcut({ enabled, onSubmit }: Params) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, onSubmit]);
}
