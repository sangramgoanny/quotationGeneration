import { createServerClient } from "@/lib/supabase/server";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/server/s3";
import type { ClientDocument, DocumentType } from "@/types/client";

export type DocumentEntityType = "CLIENT" | "LEAD";

interface DocumentRow {
  id: string;
  name: string;
  document_type: string;
  file_type: string;
  file_size: number;
  s3_key: string;
  s3_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Downloads are saved under the document type (e.g. "GST Certificate.pdf")
// rather than the originally uploaded filename.
function downloadFilename(name: string, documentType: string): string {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot) : "";
  return `${documentType}${extension}`;
}

// The bucket is private, so the stored s3_url is not directly reachable -
// every read regenerates a short-lived signed URL from the s3_key instead.
async function rowToDocument(row: DocumentRow): Promise<ClientDocument> {
  const [s3Url, downloadUrl] = await Promise.all([
    getPresignedUrl(row.s3_key),
    getPresignedDownloadUrl(row.s3_key, downloadFilename(row.name, row.document_type)),
  ]);
  return {
    id: row.id,
    name: row.name,
    documentType: row.document_type as DocumentType,
    fileType: row.file_type,
    fileSize: row.file_size,
    s3Url,
    downloadUrl,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

export async function listDocuments(entityType: DocumentEntityType, entityId: string): Promise<ClientDocument[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Failed to load documents: ${error.message}`);
  return Promise.all((data ?? []).map(rowToDocument));
}

export async function insertDocument(params: {
  entityType: DocumentEntityType;
  entityId: string;
  name: string;
  documentType: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Url: string;
  uploadedBy: string;
}): Promise<ClientDocument> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      name: params.name,
      document_type: params.documentType,
      file_type: params.fileType,
      file_size: params.fileSize,
      s3_key: params.s3Key,
      s3_url: params.s3Url,
      uploaded_by: params.uploadedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save document: ${error.message}`);
  return rowToDocument(data);
}


export async function getDocumentS3Key(entityType: DocumentEntityType, entityId: string, docId: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("s3_key")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("id", docId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load document: ${error.message}`);
  return data?.s3_key ?? null;
}

export async function deleteDocumentRow(entityType: DocumentEntityType, entityId: string, docId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("id", docId);
  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}
