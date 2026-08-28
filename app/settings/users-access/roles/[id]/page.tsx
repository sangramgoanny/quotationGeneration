"use client";

import { use } from "react";
import RoleEditor from "@/components/rbac/RoleEditor";

export default function RoleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RoleEditor roleId={id} />;
}
