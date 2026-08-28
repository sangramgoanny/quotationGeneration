"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

export default function DepartmentForm({ submitting, onSubmit }: { submitting: boolean; onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    setName("");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New department name"
        className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </form>
  );
}
