"use client";

import { i } from "framer-motion/client";
import { useRouter } from "next/navigation";
import React from "react";



export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded shadow-md space-y-6 w-[400px] text-center">

        <h1 className="text-2xl font-bold">Select Document Type</h1>

        <button
          onClick={() => router.push("/quotation")}
          className="w-full bg-black text-white py-3 rounded"
        >
          Create Quotation
        </button>

        <button
          onClick={() => router.push("/agreement")}
          className="w-full bg-gray-800 text-white py-3 rounded"
        >
          Create Service Agreement
        </button>

      </div>
    </div>
  );
}