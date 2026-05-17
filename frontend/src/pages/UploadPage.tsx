import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadInvoice } from "@/services/api";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileEntry {
  file: File;
  status: UploadStatus;
  message?: string;
  invoiceId?: number;
}

const ACCEPTED = { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] };

function bytesToSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<FileEntry[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newEntries: FileEntry[] = accepted.map((f) => ({
      file: f,
      status: "idle",
    }));
    setQueue((prev) => [...prev, ...newEntries]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  });

  const removeEntry = (idx: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadAll = async () => {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== "idle") continue;

      setQueue((prev) =>
        prev.map((e, j) => (j === i ? { ...e, status: "uploading" } : e))
      );

      try {
        const result = await uploadInvoice(queue[i].file);
        setQueue((prev) =>
          prev.map((e, j) =>
            j === i
              ? { ...e, status: "success", message: result.message, invoiceId: result.invoice_id }
              : e
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload fehlgeschlagen";
        setQueue((prev) =>
          prev.map((e, j) =>
            j === i ? { ...e, status: "error", message: msg } : e
          )
        );
      }
    }
  };

  const pendingCount = queue.filter((e) => e.status === "idle").length;

  const statusIcon = (status: UploadStatus) => {
    switch (status) {
      case "uploading": return <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />;
      case "success":   return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "error":     return <XCircle className="h-4 w-4 text-red-500" />;
      default:          return <FileType className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-indigo-500 bg-indigo-50/60 scale-[1.01]"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60"
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-colors",
            isDragActive ? "bg-indigo-100" : "bg-slate-100"
          )}
        >
          <Upload
            className={cn(
              "h-7 w-7 transition-colors",
              isDragActive ? "text-indigo-600" : "text-slate-500"
            )}
          />
        </div>
        <p className="text-base font-semibold text-slate-700">
          {isDragActive ? "Loslassen zum Hochladen" : "Dateien hierher ziehen"}
        </p>
        <p className="mt-1.5 text-sm text-slate-400">
          oder{" "}
          <span className="text-indigo-600 font-medium underline-offset-2 hover:underline">
            Dateien auswählen
          </span>
        </p>
        <div className="mt-4 flex gap-2">
          {["PDF", "PNG", "JPG"].map((ext) => (
            <span
              key={ext}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Upload-Warteschlange
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({queue.length} Datei{queue.length !== 1 ? "en" : ""})
              </span>
            </h2>
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                {pendingCount} hochladen
              </button>
            )}
          </div>

          <ul className="divide-y divide-slate-50">
            {queue.map((entry, idx) => (
              <li key={idx} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 flex-shrink-0">
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {bytesToSize(entry.file.size)}
                    {entry.message && (
                      <span
                        className={cn(
                          "ml-2",
                          entry.status === "success" ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {entry.message}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusIcon(entry.status)}
                  {entry.status === "idle" && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl bg-blue-50 px-4 py-3.5 text-sm text-blue-700 ring-1 ring-blue-200">
        <strong>Hinweis:</strong> Hochgeladene Dateien werden automatisch per OCR verarbeitet und
        die Rechnungsdaten via KI extrahiert. Der Vorgang dauert typischerweise 5–15 Sekunden.
      </div>
    </div>
  );
}
