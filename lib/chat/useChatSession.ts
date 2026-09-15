"use client";

import { useEffect, useState } from "react";
import { fetchChatToken } from "@/lib/api/chat-token";
import { chatTokenExpiringSoon, clearChatBootstrap, storeChatBootstrap } from "@/lib/chat/tokenBridge";
import { getToken as getErpToken } from "@/utils/token";

/**
 * Ensures a valid chat access token is present in localStorage before mounting
 * the chat iframe. Refreshes proactively at 4-minute intervals (chat JWTs
 * default to 15 min TTL).
 */
export function useChatSession() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensure() {
      if (!getErpToken()) {
        clearChatBootstrap();
        if (!cancelled) { setReady(false); setError(null); }
        return;
      }
      if (chatTokenExpiringSoon()) {
        try {
          const b = await fetchChatToken();
          if (cancelled) return;
          storeChatBootstrap(b);
          setError(null);
        } catch (e) {
          if (!cancelled) setError((e as Error).message);
          return;
        }
      }
      if (!cancelled) setReady(true);
    }

    void ensure();
    const iv = window.setInterval(ensure, 4 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, []);

  return { ready, error };
}
