import type { Metadata } from "next";
import ConditionalLayout from "../components/ConditionalLayout";
import { ReactNode } from "react";
import "./globals.css";
import { AuthRbacProvider } from "@/lib/rbac/AuthRbacProvider";

export const metadata: Metadata = {
  title: {
    default: "Goanny ERP",
    template: "%s | Goanny ERP",
  },
  description: "Goanny Technologies — Internal CRM, Sales, Finance & Project Management System.",
  robots: { index: false, follow: false },
  icons: { icon: "/GoannyLogo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthRbacProvider><ConditionalLayout>{children}</ConditionalLayout></AuthRbacProvider>
      </body>
    </html>
  );
}
