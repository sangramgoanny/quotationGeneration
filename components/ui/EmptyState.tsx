import React from "react";
import { AlertCircle } from "lucide-react";

export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
