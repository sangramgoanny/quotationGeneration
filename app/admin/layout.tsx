import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goanny ERP — Admin",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
