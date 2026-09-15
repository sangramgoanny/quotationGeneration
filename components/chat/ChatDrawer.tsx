"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, X } from "lucide-react";
import { useChatSession } from "@/lib/chat/useChatSession";
import { getChatToken, getChatUser } from "@/lib/chat/tokenBridge";

interface Props { open: boolean; onClose: () => void }

const CHAT_ORIGIN = process.env.NEXT_PUBLIC_CHAT_ORIGIN ?? "http://localhost:3100";

export function ChatDrawer({ open, onClose }: Props) {
  const { ready, error } = useChatSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // When running on a different origin the iframe cannot read our localStorage.
  // Push the token via postMessage as soon as the child announces readiness.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <>
      {open ? (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition"
        />
      ) : null}
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[440px] bg-[#061526] shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-semibold">Chat</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="h-[calc(100vh-3.5rem)]">
          {error ? (
            <div className="p-4 text-sm text-rose-300">Chat unavailable: {error}</div>
          ) : ready ? (
            <iframe
              ref={iframeRef}
              title="Goanny Chat"
              src={`${CHAT_ORIGIN}/embed?theme=goanny-dark`}
              className="h-full w-full border-0"
              allow="camera; microphone; display-capture; autoplay; clipboard-read; clipboard-write"
            />
          ) : (
            <div className="p-4 text-sm text-slate-300">Connecting…</div>
          )}
        </div>
      </aside>
    </>
  );
}
