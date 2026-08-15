import {
  Clapperboard,
  Download,
  LoaderCircle,
  Mic2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractJson,
  poeChat,
  poeGenerateSpeech,
  PoeApiError,
  type PoePart,
} from "@/lib/poeApi";
import { carouselRole } from "@/lib/storyboardAgent";
import {
  selectedImagesForPages,
  useProjectStore,
  type AudioVariant,
  type GeneratedImage,
  type NarrationSegment,
} from "@/store/projectStore";

interface NarrationJson {
  narration?: string;
}

function estimateDurationSeconds(text: string, language: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  if (language.startsWith("zh")) {
    const chars = trimmed.replace(/\s+/g, "").length;
    return Math.max(1, Math.round(chars / 4.2));
  }
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 2.4));
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function downloadAudio(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function CaptionAudioStep() {
  const { t, i18n } = useTranslation();
  const ideaText = useProjectStore((s) => s.ideaText);
  const brief = useProjectStore((s) => s.brief);
  const storyDesign = useProjectStore((s) => s.storyDesign);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const imagePages = useProjectStore((s) => s.imagePages);
  const narrationSegments = useProjectStore((s) => s.narrationSegments);
  const selectedCaption = useProjectStore((s) => s.selectedCaption);
  const audioVariants = useProjectStore((s) => s.audioVariants);
  const selectedAudioVariantId = useProjectStore((s) => s.selectedAudioVariantId);
  const apiKey = useProjectStore((s) => s.poeApiKey);
  const textModel = useProjectStore((s) => s.modelSettings.text);
  const voiceModel = useProjectStore((s) => s.modelSettings.voice);
  const format = useProjectStore((s) => s.format);
  const projectName = useProjectStore((s) => s.projectName);
  const setSelectedCaption = useProjectStore((s) => s.setSelectedCaption);
  const setNarrationSegments = useProjectStore((s) => s.setNarrationSegments);
  const setVoiceoverGenerated = useProjectStore((s) => s.setVoiceoverGenerated);
  const setNarrationConfirmed = useProjectStore((s) => s.setNarrationConfirmed);
  const setAudioVariants = useProjectStore((s) => s.setAudioVariants);
  const setSelectedAudioVariantId = useProjectStore(
    (s) => s.setSelectedAudioVariantId,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [spokenScript, setSpokenScript] = useState("");
  const [error, setError] = useState("");
  const [hasHydratedSpeech, setHasHydratedSpeech] = useState(false);

  const confirmedImages = useMemo(
    () => selectedImagesForPages(generatedImages, imagePages),
    [generatedImages, imagePages],
  );

  const script =
    selectedCaption.trim() ||
    narrationSegments
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join("\n\n");

  const selectedAudio =
    audioVariants.find((variant) => variant.id === selectedAudioVariantId) ??
    audioVariants.find((variant) => variant.audioUrl) ??
    null;
  const audioUrl = selectedAudio?.audioUrl ?? "";
  useEffect(() => {
    if (hasHydratedSpeech) return;
    if (audioUrl && script) {
      setSpokenScript(script);
    }
    setHasHydratedSpeech(true);
  }, [audioUrl, hasHydratedSpeech, script]);

  const scriptChanged = Boolean(audioUrl && spokenScript && spokenScript !== script);
  const durationSeconds = estimateDurationSeconds(script, i18n.language);
  const pageAspect = format === "post" ? "aspect-[4/5]" : "aspect-[9/16]";

  const persistScript = (
    nextScript: string,
    extras?: { audioUrl?: string; keepAudio?: boolean },
  ) => {
    setSelectedCaption(nextScript);
    const firstImage = confirmedImages[0];
    const nextAudioUrl =
      extras?.audioUrl ??
      (extras?.keepAudio === false ? undefined : narrationSegments[0]?.audioUrl);
    const segments: NarrationSegment[] = nextScript.trim()
      ? [
          {
            id: narrationSegments[0]?.id ?? `narration-${Date.now()}`,
            imageId: firstImage?.id ?? narrationSegments[0]?.imageId ?? "",
            text: nextScript.trim(),
            startSeconds: 0,
            durationSeconds: estimateDurationSeconds(nextScript, i18n.language),
            ...(nextAudioUrl ? { audioUrl: nextAudioUrl } : {}),
          },
        ]
      : [];
    setNarrationSegments(segments);
    setNarrationConfirmed(Boolean(nextScript.trim()));
  };

  const generateNarration = async () => {
    if (!confirmedImages.length) return;
    setError("");
    setIsGenerating(true);
    try {
      const outputLanguage = i18n.language.startsWith("en")
        ? "English"
        : "spoken Hong Kong Traditional Chinese";
      const content: PoePart[] = [
        {
          type: "text",
          text: `Write one continuous knowledge-explanation narration for this popular-science image set.

Idea: ${ideaText}
Summary: ${brief.summary || storyDesign.summary}
Caption direction: ${brief.captionDirection}
Audience: ${storyDesign.audience}
Visual direction: ${storyDesign.style} · ${storyDesign.mood}

Look at every attached image in order. Explain the knowledge clearly for the general public. This is a single off-screen narrator, never a character speaking. Do not invent facts that the images or notes do not support. Prefer a substantial spoken explanation, not one short line per image. People will swipe the images while this audio plays.

Return valid JSON only: {"narration":"..."}.
Write the narration in ${outputLanguage}.`,
        },
      ];

      confirmedImages.forEach((image, index) => {
        const page =
          imagePages.find((item) => item.id === image.pageId) ??
          imagePages[index];
        const role = carouselRole(index, confirmedImages.length);
        content.push({
          type: "text",
          text: `Image ${index + 1} (${role}). Scene: ${page?.scene || image.alt}. Notes: ${page?.dialogue || page?.suggestedText || "none"}.`,
        });
        content.push({
          type: "image_url",
          image_url: { url: image.url },
        });
      });

      const response = await poeChat({
        apiKey,
        model: textModel,
        maxTokens: 4000,
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content:
              "You write long, clear educational voiceover scripts for HKSDPCL popular-science carousels. Read the images first, then explain the knowledge in one continuous spoken narration. Return JSON only.",
          },
          { role: "user", content },
        ],
      });

      let narration = "";
      try {
        const parsed = extractJson<NarrationJson>(response.text);
        narration = parsed.narration?.trim() ?? "";
      } catch {
        narration = response.text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      }
      if (!narration) throw new Error(t("workflow.caption.noNarrationResult"));

      persistScript(narration, { keepAudio: false });
      setAudioVariants([]);
      setSelectedAudioVariantId(null);
      setSpokenScript("");
      setVoiceoverGenerated(false);
    } catch (caught) {
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.caption.agentError"),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSpeech = async () => {
    if (!script.trim()) return;
    setError("");
    setIsGeneratingAudio(true);
    try {
      const response = await poeGenerateSpeech({
        apiKey,
        model: voiceModel,
        text: script,
      });
      const url = response.audios[0]?.url;
      if (!url) throw new Error(t("workflow.caption.noSpeechResult"));
      const variant: AudioVariant = {
        id: `audio-${Date.now()}`,
        label: t("workflow.caption.speechReady"),
        createdAt: Date.now(),
        audioUrl: url,
      };
      setAudioVariants([variant]);
      setSelectedAudioVariantId(variant.id);
      persistScript(script, { audioUrl: url });
      setSpokenScript(script);
      setVoiceoverGenerated(true);
    } catch (caught) {
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.caption.agentError"),
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const onDownload = async () => {
    if (!audioUrl) return;
    setIsDownloading(true);
    try {
      await downloadAudio(
        audioUrl,
        `${(projectName || "hksdpcl-narration").replace(/[^\w\u4e00-\u9fff-]+/g, "-")}.mp3`,
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!confirmedImages.length) {
    return (
      <div className="grid h-full min-h-0 place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="text-[20px] font-medium tracking-tight text-foreground">
            {t("workflow.caption.emptyTitle")}
          </p>
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
            {t("workflow.caption.emptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <p className="text-[13px] font-medium text-muted-foreground">
          {t("workflow.caption.imagesTitle")}
        </p>
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {confirmedImages.map((image, index) => (
            <ImageThumb
              key={image.id}
              image={image}
              index={index}
              aspect={pageAspect}
              label={t("workflow.caption.scene", { number: index + 1 })}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 sm:mx-6 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <section className="flex min-h-0 flex-col border-b border-border p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium text-foreground">
                {t("workflow.caption.variantsTitle")}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {script
                  ? t("workflow.caption.scriptMeta", {
                      duration: formatDuration(durationSeconds),
                    })
                  : t("workflow.caption.scriptHint")}
              </p>
            </div>
            <Button
              size="sm"
              variant={script ? "outline" : "default"}
              className="rounded-lg"
              onClick={() => void generateNarration()}
              disabled={isGenerating || isGeneratingAudio}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {isGenerating
                ? t("workflow.caption.generating")
                : script
                  ? t("workflow.caption.regenerate")
                  : t("workflow.caption.generate")}
            </Button>
          </div>

          {script ? (
            <textarea
              value={script}
              onChange={(event) => persistScript(event.target.value)}
              placeholder={t("workflow.caption.editPlaceholder")}
              className="mt-4 min-h-0 w-full flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] leading-7 text-foreground outline-none focus-visible:border-primary/40"
            />
          ) : (
            <div className="mt-4 grid min-h-0 flex-1 place-items-center rounded-xl bg-muted/40 px-6 text-center">
              <div>
                <Mic2 className="mx-auto size-6 text-muted-foreground/70" />
                <p className="mt-3 text-[15px] font-medium text-foreground">
                  {t("workflow.caption.waitingTitle")}
                </p>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  {t("workflow.caption.waitingDescription")}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col p-5 sm:p-6">
          <p className="text-[15px] font-medium text-foreground">
            {t("workflow.caption.audioTitle")}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {t("workflow.caption.audioDescription")}
          </p>

          <Button
            className="mt-4 rounded-lg"
            disabled={!script || isGeneratingAudio || isGenerating}
            onClick={() => void generateSpeech()}
          >
            {isGeneratingAudio ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Volume2 />
            )}
            {isGeneratingAudio
              ? t("workflow.caption.generatingAudio")
              : audioUrl
                ? t("workflow.caption.regenerateVoiceover")
                : t("workflow.caption.generateVoiceover")}
          </Button>

          {scriptChanged && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {t("workflow.caption.scriptChanged")}
            </p>
          )}

          {audioUrl ? (
            <div className="mt-5 space-y-3">
              <audio
                key={audioUrl}
                controls
                src={audioUrl}
                className="w-full"
                aria-label={t("workflow.caption.play")}
              />
              <Button
                variant="outline"
                className="w-full rounded-lg"
                disabled={isDownloading}
                onClick={() => void onDownload()}
              >
                {isDownloading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Download />
                )}
                {isDownloading
                  ? t("workflow.caption.downloading")
                  : t("workflow.caption.downloadAudio")}
              </Button>
            </div>
          ) : (
            <div className="mt-5 grid flex-1 place-items-center rounded-xl bg-muted/40 px-5 py-8 text-center">
              <div>
                <Volume2 className="mx-auto size-5 text-muted-foreground/70" />
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {script
                    ? t("workflow.caption.audioWaiting")
                    : t("workflow.caption.confirmFirst")}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ImageThumb({
  image,
  index,
  aspect,
  label,
}: {
  image: GeneratedImage;
  index: number;
  aspect: string;
  label: string;
}) {
  return (
    <figure
      className={cn(
        "relative w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted",
        aspect,
      )}
    >
      {image.url ? (
        <img
          src={image.url}
          alt={image.alt || label}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <Clapperboard className="size-4 opacity-40" />
        </div>
      )}
      <figcaption className="absolute top-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
        {index + 1}
      </figcaption>
    </figure>
  );
}
