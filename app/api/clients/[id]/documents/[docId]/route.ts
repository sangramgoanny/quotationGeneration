import { NextRequest, NextResponse } from "next/server";
import { authorizeEntityAccess } from "@/lib/server/authorize";
import { getDocumentS3Key, deleteDocumentRow } from "@/lib/server/documents";
import { deleteFromS3 } from "@/lib/server/s3";

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id, docId } = await params;
  const auth = await authorizeEntityAccess(request, "clients", id);
  if (!auth.ok) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: auth.status });

  try {
    const s3Key = await getDocumentS3Key("CLIENT", id, docId);
    if (!s3Key) return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });

    await deleteFromS3(s3Key);
    await deleteDocumentRow("CLIENT", id, docId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[api/clients/:id/documents/:docId DELETE]", error);
    return NextResponse.json({ success: false, message: "Failed to delete document" }, { status: 500 });
  }
}
