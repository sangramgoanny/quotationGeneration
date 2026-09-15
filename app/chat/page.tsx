"use client";

import { useEffect, useRef } from "react";
import { useChatSession } from "@/lib/chat/useChatSession";
import { getChatToken, getChatUser } from "@/lib/chat/tokenBridge";

const CHAT_ORIGIN = process.env.NEXT_PUBLIC_CHAT_ORIGIN ?? "http://localhost:3100";

export default function ChatPage() {
  const { ready, error } = useChatSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Push token via postMessage on cross-origin embeds (same-origin reverse
  // proxy setups read localStorage directly and this handler is a no-op).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!CHAT_ORIGIN.startsWith(e.origin) && e.origin !== CHAT_ORIGIN) return;
      if (e.data?.type !== "goanny-chat:ready") return;
      const token = getChatToken();
      const user = getChatUser();
      if (!token || !user || !iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        { type: "goanny-chat:auth", accessToken: token, user },
        CHAT_ORIGIN,
      );
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (error) return <div className="p-6 text-sm text-rose-600">Chat unavailable: {error}</div>;
  if (!ready) return <div className="p-6 text-sm text-slate-500">Connecting to chat…</div>;

  return (
    <iframe
      ref={iframeRef}
      title="Goanny Chat"
      src={`${CHAT_ORIGIN}/embed?theme=goanny-dark`}
      className="h-[calc(100vh-3.5rem-3rem)] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
      allow="camera; microphone; display-capture; autoplay; clipboard-read; clipboard-write"
    />
  );
}
