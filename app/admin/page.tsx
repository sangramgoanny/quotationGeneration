"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHeader, clearToken } from "@/utils/token";

interface Admin {
  id: number;
  email: string;
  name: string;
}

const stats = [
  { label: "Quotations", value: "—", icon: "📄" },
  { label: "Invoices", value: "—", icon: "🧾" },
  { label: "Receipts", value: "—", icon: "🗒️" },
  { label: "Contracts", value: "—", icon: "📑" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auth/me`, { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => {
        if (data.admin || data.user) setAdmin(data.admin ?? data.user);
        else router.push("/admin/login");
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">Goanny ERP</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {admin?.name || admin?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500
                       px-3 py-1.5 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Welcome back, {admin?.name || "Admin"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-200 mb-4">Quick access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/quotation", label: "Quotation" },
              { href: "/invoice", label: "Invoice" },
              { href: "/receipt", label: "Receipt" },
              { href: "/contract", label: "Contract" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center justify-center py-3 px-4 bg-gray-800 hover:bg-gray-700
                           border border-gray-700 rounded-lg text-sm font-medium transition"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
