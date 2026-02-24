import Sidebar from "../components/Sidebar";
import { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen bg-gray-100">

          <Sidebar />

          <main className="flex-1 p-8">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}