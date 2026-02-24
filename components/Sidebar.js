"use client";

import { useRouter } from "next/navigation";


export default function Sidebar() {
  const router = useRouter();

  return (
    <div className="w-64 bg-black text-white p-6 space-y-6">

      <h2 className="text-xl font-bold">Goanny ERP</h2>

      <div className="space-y-3">

        <button
          onClick={() => router.push("/quotation")}
          className="block w-full text-left hover:bg-gray-800 p-2 rounded"
        >
          📄 Quotation
        </button>

        <button
          onClick={() => router.push("/contract")}
          className="block w-full text-left hover:bg-gray-800 p-2 rounded"
        >
          📜 Service Agreement
        </button>

      </div>
    </div>
  );
}