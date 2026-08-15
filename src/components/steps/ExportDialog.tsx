import { FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { selectedImagesForPages, useProjectStore } from "@/store/projectStore";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const write16 = (view: DataView, position: number, value: number) =>
    view.setUint16(position, value, true);
  const write32 = (view: DataView, position: number, value: number) =>
    view.setUint32(position, value, true);

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    write32(view, 0, 0x04034b50);
    write16(view, 4, 20);
    write16(view, 6, 0);
    write16(view, 8, 0);
    write16(view, 10, 0);
    write16(view, 12, 0);
    write32(view, 14, crc32(file.data));
    write32(view, 18, file.data.length);
    write32(view, 22, file.data.length);
    write16(view, 26, name.length);
    write16(view, 28, 0);
    header.set(name, 30);
    localParts.push(header, file.data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0);
    write16(centralView, 10, 0);
    write16(centralView, 12, 0);
    write16(centralView, 14, 0);
    write32(centralView, 16, crc32(file.data));
    write32(centralView, 20, file.data.length);
    write32(centralView, 24, file.data.length);
    write16(centralView, 28, name.length);
    write16(centralView, 30, 0);
    write16(centralView, 32, 0);
    write16(centralView, 34, 0);
    write16(centralView, 36, 0);
    write32(centralView, 38, 0);
    write32(centralView, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += header.length + file.data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 8, files.length);
  write16(endView, 10, files.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, centralOffset);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

function safeFilename(value: string) {
  return (
    value.replace(/[^a-z0-9\-\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "") ||
    "hksdpcl-campaign"
  );
}

export function ExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const projectName = useProjectStore((s) => s.projectName);
  const imagePages = useProjectStore((s) => s.imagePages);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const exportImages = selectedImagesForPages(generatedImages, imagePages);
  const narrationSegments = useProjectStore((s) => s.narrationSegments);
  const selectedCaption = useProjectStore((s) => s.selectedCaption);
  const audioVariants = useProjectStore((s) => s.audioVariants);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setWarning("");
      setIsExporting(false);
    }
  }, [open]);

  const exportPackage = async () => {
    if (!exportImages.length) return;
    setError("");
    setWarning("");
    setIsExporting(true);
    const baseName = safeFilename(projectName || "hksdpcl-campaign");
    try {
      const files: Array<{ name: string; data: Uint8Array }> = [];
      let skippedFiles = 0;
      const variants = audioVariants.filter(
        (variant) => variant.script?.trim() || variant.audioUrl,
      );
      const fallbackNarration =
        selectedCaption.trim() ||
        narrationSegments.map((segment) => segment.text).join("\n\n");
      if (variants.length) {
        for (const [index, variant] of variants.entries()) {
          const label = safeFilename(variant.label || `version-${index + 1}`);
          if (variant.script?.trim()) {
            files.push({
              name: `${baseName}-${label}.txt`,
              data: new TextEncoder().encode(variant.script.trim()),
            });
          }
          if (variant.audioUrl) {
            try {
              const response = await fetch(variant.audioUrl);
              if (!response.ok) throw new Error("audio download failed");
              files.push({
                name: `${baseName}-${label}.mp3`,
                data: new Uint8Array(await response.arrayBuffer()),
              });
            } catch {
              skippedFiles += 1;
            }
          }
        }
      } else if (fallbackNarration) {
        files.push({
          name: `${baseName}-narration.txt`,
          data: new TextEncoder().encode(fallbackNarration),
        });
      }
      for (let index = 0; index < exportImages.length; index += 1) {
        const image = exportImages[index];
        try {
          const response = await fetch(image.url);
          if (!response.ok) throw new Error("image download failed");
          files.push({
            name: `${baseName}-${index + 1}.png`,
            data: new Uint8Array(await response.arrayBuffer()),
          });
        } catch {
          skippedFiles += 1;
        }
      }
      if (!files.length) throw new Error("empty export");
      downloadBlob(createZip(files), `${baseName}.zip`);
      if (skippedFiles) {
        setWarning(t("workflow.export.downloadPartial", { count: skippedFiles }));
        return;
      }
      onClose();
    } catch {
      setError(t("workflow.export.downloadError"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2
          id="export-dialog-title"
          className="text-lg font-bold text-foreground"
        >
          {t("workflow.export.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("workflow.export.description")}
        </p>
        {error && (
          <p className="mt-3 text-xs leading-relaxed text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        {warning && (
          <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            {warning}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("nav.cancel")}
          </button>
          <Button
            size="sm"
            className="h-10 rounded-xl px-4"
            disabled={!exportImages.length || isExporting}
            onClick={() => void exportPackage()}
          >
            {isExporting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <FileDown />
            )}
            {isExporting
              ? t("workflow.export.downloading")
              : t("workflow.export.download")}
          </Button>
        </div>
      </div>
    </div>
  );
}
