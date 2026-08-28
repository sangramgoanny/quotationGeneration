import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px]">{children}</div>;
}
