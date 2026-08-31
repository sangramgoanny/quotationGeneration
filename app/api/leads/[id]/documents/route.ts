import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeEntityAccess } from "@/lib/server/authorize";
import { listDocuments, insertDocument } from "@/lib/server/documents";
import { uploadToS3 } from "@/lib/server/s3";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const auth = await authorizeEntityAccess(request, "leads", id);
  if (!auth.ok) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: auth.status });

  try {
    const documents = await listDocuments("LEAD", id);
    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("[api/leads/:id/documents GET]", error);
    return NextResponse.json({ success: false, message: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const auth = await authorizeEntityAccess(request, "leads", id);
  if (!auth.ok) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: auth.status });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Expected multipart/form-data" }, { status: 400 });
  }

  const documentType = String(formData.get("documentType") ?? "Other");
  const entries = [...formData.getAll("files"), ...formData.getAll("file")];
  const files = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });

  const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
  if (oversized) {
    return NextResponse.json({ success: false, message: `${oversized.name} exceeds the 25MB limit` }, { status: 400 });
  }

  try {
    const created = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const key = `documents/leads/${id}/${randomUUID()}-${safeName}`;
        const s3Url = await uploadToS3(key, buffer, file.type || "application/octet-stream");
        return insertDocument({
          entityType: "LEAD",
          entityId: id,
          name: file.name,
          documentType,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          s3Key: key,
          s3Url,
          uploadedBy: auth.uploadedBy,
        });
      })
    );
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("[api/leads/:id/documents POST]", error);
    return NextResponse.json({ success: false, message: "Failed to upload document" }, { status: 500 });
  }
}
