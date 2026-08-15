import {
  ArrowLeft,
  Check,
  Clock3,
  FileDown,
  ImageIcon,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { cn } from "@/lib/utils";
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
  const write16 = (view: DataView, position: number, value: number) => view.setUint16(position, value, true);
  const write32 = (view: DataView, position: number, value: number) => view.setUint32(position, value, true);

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
  return value.replace(/[^a-z0-9\-\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "") || "hksdpcl-campaign";
}

export function ExportStep() {
  const { t } = useTranslation();
  const projectName = useProjectStore((s) => s.projectName);
  const brief = useProjectStore((s) => s.brief);
  const storyDesign = useProjectStore((s) => s.storyDesign);
  const imagePages = useProjectStore((s) => s.imagePages);
  const characters = useProjectStore((s) => s.characters);
  const selectedCharacterIds = useProjectStore((s) => s.selectedCharacterIds);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const exportImages = selectedImagesForPages(generatedImages, imagePages);
  const narrationSegments = useProjectStore((s) => s.narrationSegments);
  const selectedCaption = useProjectStore((s) => s.selectedCaption);
  const audioVariants = useProjectStore((s) => s.audioVariants);
  const selectedAudioVariantId = useProjectStore((s) => s.selectedAudioVariantId);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const goToStep = useProjectStore((s) => s.goToStep);
  const newProject = useProjectStore((s) => s.newProject);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState("");

  const exportPackage = async () => {
    if (!exportImages.length) return;
    setError("");
    setExported(false);
    setIsExporting(true);
    const baseName = safeFilename(projectName || "hksdpcl-campaign");
    try {
      const selectedCharacters = characters.filter((character) =>
        selectedCharacterIds.includes(character.id),
      );
      const manifest = {
        app: "HKSDPCL Studio",
        exportedAt: new Date().toISOString(),
        project: projectName || t("nav.untitledProject"),
        aspectRatio,
        brief,
        storyDesign,
        pages: imagePages.map((page, index) => ({
          index: index + 1,
          title: page.title,
          scene: page.scene,
          characters: page.characters,
          dialogue: page.dialogue,
          suggestedText: page.suggestedText,
          composition: page.composition,
          imagePrompt: page.imagePrompt,
          selectedImageId: page.selectedImageId,
        })),
        characters: selectedCharacters.map((character) => ({
          id: character.id,
          name: character.name,
          background: character.background,
          imageCount: character.images.length,
        })),
        images: exportImages.map((image, index) => ({
          file: `${baseName}-${index + 1}.png`,
          source: image.url,
          prompt: image.prompt,
          pageId: image.pageId ?? null,
        })),
        narration: selectedCaption || narrationSegments.map((segment) => segment.text).join("\n\n"),
        narrationSegments,
      };
      const narrationText =
        selectedCaption.trim() ||
        narrationSegments.map((segment) => segment.text).join("\n\n");
      const selectedAudio =
        audioVariants.find((variant) => variant.id === selectedAudioVariantId) ??
        audioVariants.find((variant) => variant.audioUrl);
      const files: Array<{ name: string; data: Uint8Array }> = [
        {
          name: "manifest.json",
          data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
        },
        {
          name: "storyboard.json",
          data: new TextEncoder().encode(
            JSON.stringify({ storyDesign, pages: imagePages }, null, 2),
          ),
        },
      ];
      if (narrationText) {
        files.push({
          name: "narration.txt",
          data: new TextEncoder().encode(narrationText),
        });
      }
      selectedCharacters.forEach((character, characterIndex) => {
        character.images.forEach((image, imageIndex) => {
          if (!image.dataUrl.startsWith("data:")) return;
          const match = /^data:([^;]+);base64,(.+)$/.exec(image.dataUrl);
          if (!match) return;
          const bytes = Uint8Array.from(atob(match[2]), (char) =>
            char.charCodeAt(0),
          );
          const extension = match[1].includes("png")
            ? "png"
            : match[1].includes("webp")
              ? "webp"
              : "jpg";
          files.push({
            name: `characters/${characterIndex + 1}-${safeFilename(character.name || "character")}-${imageIndex + 1}.${extension}`,
            data: bytes,
          });
        });
      });
      const failedImages: string[] = [];
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
          failedImages.push(`${index + 1}: ${image.url}`);
        }
      }
      if (failedImages.length) {
        files.push({
          name: "image-download-notes.txt",
          data: new TextEncoder().encode(
            "Some hosted images could not be copied into the package. Open these source URLs while they are still available:\n\n" +
              failedImages.join("\n"),
          ),
        });
      }
      if (selectedAudio?.audioUrl) {
        try {
          const response = await fetch(selectedAudio.audioUrl);
          if (!response.ok) throw new Error("audio download failed");
          files.push({
            name: `${baseName}-narration.mp3`,
            data: new Uint8Array(await response.arrayBuffer()),
          });
        } catch {
          files.push({
            name: "audio-download-notes.txt",
            data: new TextEncoder().encode(
              "The generated narration audio could not be copied into the package. Open this source URL while it is still available:\n\n" +
                selectedAudio.audioUrl,
            ),
          });
        }
      }
      downloadBlob(createZip(files), `${baseName}.zip`);
      setExported(true);
    } catch {
      setError(t("workflow.export.downloadError"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-6 py-8 sm:px-8">
      <StepHeader
        eyebrow={t("workflow.export.eyebrow")}
        title={t("workflow.export.title")}
        description={t("workflow.export.description")}
        action={<Button variant="ghost" size="sm" className="rounded-full" onClick={() => goToStep("workbench")}><ArrowLeft />{t("workflow.back")}</Button>}
      />
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <Card className="mt-7 overflow-hidden">
        <CardHeader className="border-b border-border"><div className="flex items-center justify-between gap-3"><CardTitle>{t("workflow.export.packageTitle")}</CardTitle><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">{exportImages.length ? t("workflow.export.ready") : t("workflow.export.incomplete")}</span></div></CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ icon: ImageIcon, label: t("workflow.export.image"), value: t("workflow.export.imageCount", { count: exportImages.length }) }, { icon: MessageSquareText, label: t("workflow.export.caption"), value: selectedCaption || narrationSegments.length ? t("workflow.export.narrationReady") : t("workflow.export.optional") }, { icon: Volume2, label: t("workflow.export.audio"), value: audioVariants.some((variant) => variant.audioUrl) ? t("workflow.export.audioReady") : t("workflow.export.optional") }].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl border border-border bg-muted/50 p-3"><Icon className="size-4 text-primary" /><div className="mt-3 text-xs font-semibold text-muted-foreground">{label}</div><div className="mt-1 text-sm font-bold text-foreground">{value}</div></div>)}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exportImages.map((image, index) => <div key={image.id} className="overflow-hidden rounded-2xl border border-border bg-muted"><img src={image.url} alt={image.alt} className={cn("w-full object-cover", aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]")} /><div className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"><span className="font-bold text-foreground">{t("workflow.export.scene", { number: index + 1 })}</span>{narrationSegments.some((segment) => segment.imageId === image.id) && <Check className="size-3.5 text-primary" />}</div></div>)}
          </div>

          {(selectedCaption || narrationSegments.length > 0) && <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4"><div className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"><Clock3 className="size-3.5 text-primary" />{t("workflow.export.timelineTitle")}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selectedCaption || narrationSegments.map((segment) => segment.text).join("\n\n")}</p></div>}

          {exported && <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary"><Check className="size-4" />{t("workflow.export.exported")}</div>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button className="rounded-2xl" disabled={!exportImages.length || isExporting} onClick={() => void exportPackage()}>{isExporting ? <LoaderCircle className="animate-spin" /> : <FileDown />}{isExporting ? t("workflow.export.downloading") : t("workflow.export.download")}</Button><Button variant="outline" className="rounded-2xl" onClick={newProject}><Plus />{t("workflow.export.newProject")}</Button></div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("workflow.export.downloadDescription")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
