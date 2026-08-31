"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, Download, Eye, FileText, Upload, X } from "lucide-react";
import { DOCUMENT_TYPES, type ClientDocument, type DocumentType } from "@/types/client";

function isImage(doc: ClientDocument) {
  return doc.fileType.startsWith("image/");
}

function downloadFilename(doc: ClientDocument) {
  const dot = doc.name.lastIndexOf(".");
  const extension = dot >= 0 ? doc.name.slice(dot) : "";
  return `${doc.documentType}${extension}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  documents: ClientDocument[] | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  onUpload: (files: File[], documentType: DocumentType) => void | Promise<void>;
}

export default function DocumentsPanel({ documents, loading, uploading, error, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("Other");
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      setDocumentType("Other");
      setPendingFiles(files);
    }
    e.target.value = "";
  };

  const confirmUpload = async () => {
    if (!pendingFiles?.length) return;
    await onUpload(pendingFiles, documentType);
    setPendingFiles(null);
  };

  const uploadButton = (
    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${uploading ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
      <Upload className="w-3.5 h-3.5" /> Upload Documents
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={handleFilesPicked}
      />
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">{uploadButton}</div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No documents uploaded</p>
          <div className="mt-4">{uploadButton}</div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Document Name</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Size</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isImage(doc) ? (
                        <button type="button" onClick={() => setPreviewDoc(doc)} className="shrink-0" title="View image">
                          <img src={doc.s3Url} alt={doc.name} className="h-8 w-8 rounded-md object-cover border border-slate-200" />
                        </button>
                      ) : (
                        <FileText className="h-8 w-8 shrink-0 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-400" />
                      )}
                      <span className="truncate max-w-[160px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{doc.documentType}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatDate(doc.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {isImage(doc) ? (
                        <button type="button" onClick={() => setPreviewDoc(doc)} className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <a href={doc.s3Url} target="_blank" rel="noreferrer" className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <a href={doc.downloadUrl} download={downloadFilename(doc)} className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingFiles && pendingFiles.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                {pendingFiles.length === 1 ? "1 file selected" : `${pendingFiles.length} files selected`}
              </h3>
              <button type="button" onClick={() => setPendingFiles(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cancel">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto px-5 py-3">
              {pendingFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto shrink-0 text-slate-400">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-2">
              <label className="block text-xs font-semibold text-slate-600">
                Document Type
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  disabled={uploading}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-60"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setPendingFiles(null)}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" onClick={() => setPreviewDoc(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 truncate">{previewDoc.name}</h3>
              <button type="button" onClick={() => setPreviewDoc(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 shrink-0" aria-label="Close preview">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-64px)] overflow-auto p-4">
              <img src={previewDoc.s3Url} alt={previewDoc.name} className="mx-auto max-h-[75vh] w-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
