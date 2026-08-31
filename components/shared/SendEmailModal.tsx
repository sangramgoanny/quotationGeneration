"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { activityApi } from "@/lib/api/activity";

export interface SendEmailPayload {
  to: string;
  cc?: string[];
  subject: string;
  message: string;
}

export interface LastEmailInfo {
  to: string;
  cc?: string[];
  subject: string;
  message: string;
  sentAt: string;
}

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function SendEmailModal({
  id,
  title,
  defaultTo,
  defaultSubject,
  defaultMessage,
  lastEmail,
  emailHistory,
  onSend,
  onClose,
}: {
  id: string;
  title: string;
  defaultTo: string;
  defaultSubject: string;
  defaultMessage: string;
  lastEmail?: LastEmailInfo | null;
  emailHistory?: { to: string; sentAt: string }[];
  onSend: (payload: SendEmailPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [to, setTo] = useState(lastEmail?.to || defaultTo);
  const [cc, setCc] = useState(lastEmail?.cc?.join(", ") ?? "");
  const [subject, setSubject] = useState(lastEmail?.subject || defaultSubject);
  const [message, setMessage] = useState(lastEmail?.message || defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    activityApi.create(id, "Email Started", "Opened send-email form").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    if (!sent && id) {
      activityApi.create(id, "Email Closed", "Closed send-email form without sending").catch(() => {});
    }
    onClose();
  };

  const send = async () => {
    if (!to.trim()) { setError("Recipient email is required"); return; }
    setSending(true);
    setError("");
    try {
      await onSend({
        to: to.trim(),
        cc: cc.trim() ? cc.split(",").map((email) => email.trim()).filter(Boolean) : undefined,
        subject,
        message,
      });
      setSent(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send email");
    } finally {
      setSending(false);
    }
  };

  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Send by email</p><h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2></div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-bold text-slate-800">Email sent to {to}</p>
            <button onClick={onClose} className="mt-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-black text-white">Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-6">
              {emailHistory?.length ? (
                <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700">
                  <p className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Sent {emailHistory.length} time{emailHistory.length > 1 ? "s" : ""}
                  </p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                    {emailHistory.map((entry, index) => (
                      <li key={index} className="flex items-center justify-between gap-2">
                        <span className="truncate">{entry.to}</span>
                        <span className="shrink-0 text-indigo-500">{dateTime(entry.sentAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {error ? <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
              <label className="text-xs font-bold text-slate-600">To
                <input type="email" value={to} onChange={(event) => setTo(event.target.value)} className={field} placeholder="client@example.com" />
              </label>
              <label className="text-xs font-bold text-slate-600">Cc <span className="font-normal text-slate-400">(optional, comma separated)</span>
                <input value={cc} onChange={(event) => setCc(event.target.value)} className={field} placeholder="sales@example.com" />
              </label>
              <label className="text-xs font-bold text-slate-600">Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} className={field} />
              </label>
              <label className="text-xs font-bold text-slate-600">Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={handleClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button disabled={sending} onClick={() => void send()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {lastEmail ? "Resend Email" : "Send Email"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
