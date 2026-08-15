import {
  ChevronDown,
  Clapperboard,
  Download,
  LoaderCircle,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
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

interface NarrationVariantsJson {
  variants?: Array<{
    tone?: string;
    label?: string;
    note?: string;
    narration?: string;
  }>;
}

interface NarrationJson {
  narration?: string;
}

const SUGGESTION_TONES = ["calm", "warm", "bright"] as const;

const TONE_COPY = {
  calm: { label: "workflow.caption.audioCalm", note: "workflow.caption.audioCalmNote" },
  warm: { label: "workflow.caption.audioWarm", note: "workflow.caption.audioWarmNote" },
  bright: { label: "workflow.caption.audioBright", note: "workflow.caption.audioBrightNote" },
} as const;

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
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [imagesOpen, setImagesOpen] = useState(false);
  const [error, setError] = useState("");
  const autoStarted = useRef(false);

  const confirmedImages = useMemo(
    () => selectedImagesForPages(generatedImages, imagePages),
    [generatedImages, imagePages],
  );

  const suggestions = audioVariants.filter((variant) => variant.script?.trim());
  const pageAspect = format === "post" ? "aspect-[4/5]" : "aspect-[9/16]";

  const selectedSuggestion =
    suggestions.find((variant) => variant.id === selectedAudioVariantId) ??
    suggestions[0] ??
    null;

  const appendImageContext = (content: PoePart[]) => {
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
  };

  const persistVariantScript = (variant: AudioVariant) => {
    const script = variant.script?.trim() ?? "";
    setSelectedCaption(script);
    const firstImage = confirmedImages[0];
    const segments: NarrationSegment[] = script
      ? [
          {
            id: narrationSegments[0]?.id ?? `narration-${Date.now()}`,
            imageId: firstImage?.id ?? narrationSegments[0]?.imageId ?? "",
            text: script,
            startSeconds: 0,
            durationSeconds: estimateDurationSeconds(script, i18n.language),
            ...(variant.audioUrl ? { audioUrl: variant.audioUrl } : {}),
          },
        ]
      : [];
    setNarrationSegments(segments);
    setNarrationConfirmed(Boolean(script));
    setSelectedAudioVariantId(variant.id);
    setVoiceoverGenerated(Boolean(variant.audioUrl));
  };

  const generateSuggestions = async (direction = "") => {
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
          text: `Write three continuous knowledge-explanation narrations for this popular-science image set. Each version should cover the same facts, but with a different speaking tone:

1. calm — steady, clear, informational
2. warm — gentle, family-friendly
3. bright — lighter, slightly quicker, short-form friendly

Idea: ${ideaText}
Summary: ${brief.summary || storyDesign.summary}
Caption direction: ${brief.captionDirection}
Audience: ${storyDesign.audience}
Visual direction: ${storyDesign.style} · ${storyDesign.mood}
${direction.trim() ? `\nUser direction for tone or extra content:\n${direction.trim()}\n` : ""}
Look at every attached image in order. Explain the knowledge clearly for the general public. This is a single off-screen narrator, never a character speaking. Do not invent facts that the images or notes do not support. Prefer a substantial spoken explanation, not one short line per image.

Return valid JSON only:
{"variants":[{"tone":"calm","narration":"..."},{"tone":"warm","narration":"..."},{"tone":"bright","narration":"..."}]}
Write every narration in ${outputLanguage}.`,
        },
      ];

      appendImageContext(content);

      const response = await poeChat({
        apiKey,
        model: textModel,
        maxTokens: 5000,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You write educational voiceover scripts for HKSDPCL popular-science carousels. Return three distinct spoken tones in JSON only.",
          },
          { role: "user", content },
        ],
      });

      const parsed = extractJson<NarrationVariantsJson>(response.text);
      const nextVariants = (parsed.variants ?? [])
        .map((item, index) => {
          const tone = SUGGESTION_TONES.includes(
            item.tone as (typeof SUGGESTION_TONES)[number],
          )
            ? (item.tone as (typeof SUGGESTION_TONES)[number])
            : SUGGESTION_TONES[index] ?? "calm";
          const narration = item.narration?.trim() ?? "";
          if (!narration) return null;
          return {
            id: `audio-${tone}-${Date.now()}-${index}`,
            label: item.label?.trim() || t(TONE_COPY[tone].label),
            note: item.note?.trim() || t(TONE_COPY[tone].note),
            script: narration,
            createdAt: Date.now(),
          } satisfies AudioVariant;
        })
        .filter((item): item is AudioVariant => Boolean(item));

      if (!nextVariants.length) {
        throw new Error(t("workflow.caption.noNarrationResult"));
      }

      setAudioVariants(nextVariants);
      persistVariantScript(nextVariants[0]);
      setChatMessage("");
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

  const generateOneSuggestion = async (
    variant: AudioVariant,
    direction = "",
  ) => {
    if (!confirmedImages.length) return;
    setError("");
    setIsGenerating(true);
    persistVariantScript(variant);
    try {
      const outputLanguage = i18n.language.startsWith("en")
        ? "English"
        : "spoken Hong Kong Traditional Chinese";
      const content: PoePart[] = [
        {
          type: "text",
          text: `Rewrite only this one knowledge-explanation narration. Keep the same facts and the same speaking tone (${variant.label}${variant.note ? ` — ${variant.note}` : ""}). Apply the user's requested change. Do not rewrite the other versions.

Current script:
${variant.script ?? ""}
${direction.trim() ? `\nUser direction:\n${direction.trim()}\n` : ""}
Look at every attached image in order. This is a single off-screen narrator. Do not invent facts.

Return valid JSON only: {"narration":"..."}.
Write the narration in ${outputLanguage}.`,
        },
      ];
      appendImageContext(content);

      const response = await poeChat({
        apiKey,
        model: textModel,
        maxTokens: 4000,
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content:
              "You revise one educational voiceover script for HKSDPCL. Return JSON only.",
          },
          { role: "user", content },
        ],
      });

      let narration = "";
      try {
        narration = extractJson<NarrationJson>(response.text).narration?.trim() ?? "";
      } catch {
        narration = response.text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      }
      if (!narration) throw new Error(t("workflow.caption.noNarrationResult"));

      const nextVariant: AudioVariant = {
        ...variant,
        script: narration,
        audioUrl: undefined,
        createdAt: Date.now(),
      };
      setAudioVariants(
        useProjectStore
          .getState()
          .audioVariants.map((item) =>
            item.id === variant.id ? nextVariant : item,
          ),
      );
      persistVariantScript(nextVariant);
      setChatMessage("");
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

  const submitChat = () => {
    if (isGenerating || generatingAudioId) return;
    if (selectedSuggestion) {
      void generateOneSuggestion(selectedSuggestion, chatMessage);
      return;
    }
    void generateSuggestions(chatMessage);
  };

  const generateSpeech = async (variant: AudioVariant) => {
    const script = variant.script?.trim();
    if (!script) return;
    setError("");
    setGeneratingAudioId(variant.id);
    try {
      const response = await poeGenerateSpeech({
        apiKey,
        model: voiceModel,
        text: script,
      });
      const url = response.audios[0]?.url;
      if (!url) throw new Error(t("workflow.caption.noSpeechResult"));
      const nextVariant = { ...variant, audioUrl: url };
      setAudioVariants(
        useProjectStore
          .getState()
          .audioVariants.map((item) =>
            item.id === variant.id ? nextVariant : item,
          ),
      );
      persistVariantScript(nextVariant);
    } catch (caught) {
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.caption.agentError"),
      );
    } finally {
      setGeneratingAudioId(null);
    }
  };

  const onDownload = async (variant: AudioVariant) => {
    if (!variant.audioUrl) return;
    setDownloadingId(variant.id);
    try {
      await downloadAudio(
        variant.audioUrl,
        `${(projectName || "hksdpcl-narration").replace(/[^\w\u4e00-\u9fff-]+/g, "-")}-${variant.label}.mp3`,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (autoStarted.current || !confirmedImages.length || suggestions.length) {
      return;
    }
    autoStarted.current = true;
    void generateSuggestions();
    // First visit only: suggest voices from the current images.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedImages.length, suggestions.length]);

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
      <section className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <p className="text-[15px] font-medium text-foreground">
          {t("workflow.caption.suggestionsTitle")}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {isGenerating && !suggestions.length ? (
          <div className="mt-6 grid min-h-40 place-items-center rounded-2xl bg-muted/40 text-center">
            <div>
              <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
              <p className="mt-3 text-[13px] text-muted-foreground">
                {t("workflow.caption.generatingSuggestions")}
              </p>
            </div>
          </div>
        ) : suggestions.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {suggestions.map((variant) => {
              const selected = variant.id === selectedAudioVariantId;
              const busy = generatingAudioId === variant.id;
              return (
                <article
                  key={variant.id}
                  className={cn(
                    "flex min-h-0 cursor-pointer flex-col rounded-2xl border bg-card p-4",
                    selected ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
                  )}
                  onClick={() => persistVariantScript(variant)}
                >
                  <p className="text-[14px] font-medium text-foreground">
                    {variant.label}
                  </p>
                  {variant.note && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {variant.note}
                    </p>
                  )}
                  <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-foreground/90">
                    {variant.script}
                  </p>
                  <div className="mt-auto pt-4">
                    <Button
                      size="sm"
                      className="w-full rounded-lg"
                      disabled={isGenerating || Boolean(generatingAudioId)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void generateSpeech(variant);
                      }}
                    >
                      {busy ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Volume2 />
                      )}
                      {busy
                        ? t("workflow.caption.generatingAudio")
                        : variant.audioUrl
                          ? t("workflow.caption.regenerateVoiceover")
                          : t("workflow.caption.generateVoiceover")}
                    </Button>
                    {variant.audioUrl && (
                      <div className="mt-3 space-y-2">
                        <audio
                          key={variant.audioUrl}
                          controls
                          src={variant.audioUrl}
                          className="w-full"
                          aria-label={t("workflow.caption.play")}
                          onPlay={() => persistVariantScript(variant)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-lg"
                          disabled={downloadingId === variant.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onDownload(variant);
                          }}
                        >
                          {downloadingId === variant.id ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Download />
                          )}
                          {downloadingId === variant.id
                            ? t("workflow.caption.downloading")
                            : t("workflow.caption.downloadAudio")}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 grid min-h-40 place-items-center rounded-2xl bg-muted/40 px-6 text-center">
            <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              {t("workflow.caption.noSuggestions")}
            </p>
          </div>
        )}
      </section>

      <section className="shrink-0 border-t border-border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-left sm:px-6"
          aria-expanded={imagesOpen}
          onClick={() => setImagesOpen((open) => !open)}
        >
          <p className="text-[13px] font-medium text-muted-foreground">
            {t("workflow.caption.imagesTitle")}
          </p>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              imagesOpen && "rotate-180",
            )}
          />
        </button>
        {imagesOpen && (
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-3 sm:px-6">
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
        )}
      </section>

      <section className="shrink-0 border-t border-border px-5 py-3 sm:px-6">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <AutoGrowTextarea
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitChat();
              }
            }}
            placeholder={t("workflow.caption.chatPlaceholder")}
            className="min-h-10 flex-1 bg-transparent px-1 py-2 text-[14px] leading-6 text-foreground outline-none"
          />
          <Button
            size="sm"
            className="mb-0.5 rounded-lg"
            disabled={isGenerating || Boolean(generatingAudioId)}
            onClick={() => submitChat()}
          >
            {isGenerating ? (
              <LoaderCircle className="animate-spin" />
            ) : chatMessage.trim() ? (
              <Send />
            ) : (
              <Sparkles />
            )}
            {isGenerating
              ? t("workflow.caption.generatingSuggestions")
              : selectedSuggestion
                ? t("workflow.caption.regenerateThis", {
                    label: selectedSuggestion.label,
                  })
                : t("workflow.caption.regenerateAll")}
          </Button>
        </div>
      </section>
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
        "relative w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:w-18",
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
      <figcaption className="absolute top-1 left-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
        {index + 1}
      </figcaption>
    </figure>
  );
}
