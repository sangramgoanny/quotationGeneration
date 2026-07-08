import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Leads | Goanny ERP",
  description: "Manage and track sales leads, follow-ups, reminders, and quotations in the Goanny CRM.",
  robots: { index: false, follow: false },
  keywords: ["leads", "CRM", "sales pipeline", "follow-up", "Goanny ERP"],
  authors: [{ name: "Goanny Technologies Pvt Ltd" }],
  openGraph: {
    title: "Leads | Goanny ERP",
    description: "Track and manage all your sales leads in one place.",
    type: "website",
  },
};

export default function LeadsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
