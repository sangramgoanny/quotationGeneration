"use client";

import { useCallback, useEffect, useState } from "react";

// §20 unsaved-changes protection. Reliably covers browser tab close/refresh
// (beforeunload) and any in-page action routed through guard() — e.g. our own
// Back link or Cancel button. Next.js App Router has no built-in hook to
// intercept arbitrary sidebar navigation mid-edit, so that's not covered here.
export function useUnsavedChangesGuard(isDirty: boolean) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction(() => action);
      else action();
    },
    [isDirty]
  );

  const confirmDiscard = useCallback(() => {
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [pendingAction]);

  const cancelDiscard = useCallback(() => setPendingAction(null), []);

  return { guard, showPrompt: pendingAction !== null, confirmDiscard, cancelDiscard };
}
