import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  Mic2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { poeChatJson, PoeApiError } from "@/lib/poeApi";
import {
  useProjectStore,
  type AudioVariant,
  type NarrationSegment,
} from "@/store/projectStore";

interface NarrationResponse {
  segments?: Array<{
    imageId?: string;
    text?: string;
    startSeconds?: number;
    durationSeconds?: number;
  }>;
}

export function CaptionAudioStep() {
  const { t } = useTranslation();
  const ideaText = useProjectStore((s) => s.ideaText);
  const brief = useProjectStore((s) => s.brief);
  const storyDesign = useProjectStore((s) => s.storyDesign);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const imagePages = useProjectStore((s) => s.imagePages);
  const narrationSegments = useProjectStore((s) => s.narrationSegments);
  const audioVariants = useProjectStore((s) => s.audioVariants);
  const selectedAudioVariantId = useProjectStore((s) => s.selectedAudioVariantId);
  const narrationConfirmed = useProjectStore((s) => s.narrationConfirmed);
  const apiKey = useProjectStore((s) => s.poeApiKey);
  const textModel = useProjectStore((s) => s.modelSettings.text);
  const voiceModel = useProjectStore((s) => s.modelSettings.voice);
  const setSelectedCaption = useProjectStore((s) => s.setSelectedCaption);
  const setNarrationSegments = useProjectStore((s) => s.setNarrationSegments);
  const setVoiceoverGenerated = useProjectStore((s) => s.setVoiceoverGenerated);
  const setNarrationConfirmed = useProjectStore((s) => s.setNarrationConfirmed);
  const setAudioVariants = useProjectStore((s) => s.setAudioVariants);
  const setSelectedAudioVariantId = useProjectStore(
    (s) => s.setSelectedAudioVariantId,
  );
  const goToStep = useProjectStore((s) => s.goToStep);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState("");

  const confirmedImages = useMemo(() => {
    const selectedIds = imagePages
      .map((page) => page.selectedImageId)
      .filter((id): id is string => Boolean(id));
    if (selectedIds.length) {
      return selectedIds
        .map((id) => generatedImages.find((image) => image.id === id))
        .filter((image): image is NonNullable<typeof image> => Boolean(image));
    }
    return generatedImages;
  }, [generatedImages, imagePages]);

  const generateNarration = async () => {
    if (!confirmedImages.length) return;
    setError("");
    setIsGenerating(true);
    setNarrationConfirmed(false);
    try {
      const response = await poeChatJson<NarrationResponse>({
        apiKey,
        model: textModel,
        maxTokens: 1800,
        temperature: 0.65,
        messages: [
          {
            role: "system",
            content:
              "You are an educational narrator for HKSDPCL (Hong Kong Survival and Disaster Prevention Council) short-form learning content. Return valid JSON only: {\"segments\":[{\"imageId\":string,\"text\":string,\"startSeconds\":number,\"durationSeconds\":number}]}. Write one concise educational narration segment per image that teaches a practical safety / preparedness takeaway. Tone: calm, clear, reassuring, and public-education focused — not dramatic or fear-based. Prefer actionable guidance over storytelling fluff. Write in Traditional Chinese in a formal written style, without Cantonese colloquialisms. Start at 0 and make timings sequential with a 0.5 second breathing gap. Estimate duration at a natural speaking pace.",
          },
          {
            role: "user",
            content: `Idea: ${ideaText}
Caption direction: ${brief.captionDirection}
Summary: ${brief.summary || storyDesign.summary}
Global story design: ${JSON.stringify(storyDesign)}
Storyboard pages:
${imagePages
  .map(
    (page, index) =>
      `${index + 1}. id=${page.id}, title=${page.title}, scene=${page.scene}, dialogue=${page.dialogue}, suggestedText=${page.suggestedText}`,
  )
  .join("\n")}
Images:
${confirmedImages
  .map((image, index) => `${index + 1}. imageId=${image.id}, alt=${image.alt}, pageId=${image.pageId ?? ""}`)
  .join("\n")}`,
          },
        ],
      });
      const segments: NarrationSegment[] = (response.data.segments ?? []).flatMap(
        (segment, index) => {
          const image =
            confirmedImages.find((item) => item.id === segment.imageId) ??
            confirmedImages[index];
          if (!image || !segment.text?.trim()) return [];
          return [
            {
              id: `narration-${Date.now()}-${index}`,
              imageId: image.id,
              text: segment.text.trim(),
              startSeconds: Math.max(0, Number(segment.startSeconds) || index * 5),
              durationSeconds: Math.max(
                1,
                Number(segment.durationSeconds) || 4,
              ),
            },
          ];
        },
      );
      if (!segments.length) throw new Error(t("workflow.caption.noNarrationResult"));
      setNarrationSegments(segments);
      setSelectedCaption(segments.map((segment) => segment.text).join("\n"));
      setVoiceoverGenerated(true);
      setAudioVariants([]);
      setSelectedAudioVariantId(null);
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

  const updateSegment = (id: string, updates: Partial<NarrationSegment>) => {
    setNarrationSegments(
      narrationSegments.map((segment) =>
        segment.id === id ? { ...segment, ...updates } : segment,
      ),
    );
  };

  const confirmNarration = () => {
    if (!narrationSegments.length) return;
    setNarrationConfirmed(true);
    setSelectedCaption(narrationSegments.map((segment) => segment.text).join("\n"));
  };

  const generateAudioVariants = async () => {
    if (!narrationSegments.length) return;
    setError("");
    setIsGeneratingAudio(true);
    try {
      // Voice models on Poe vary; we create timing-ready variants the user can pick.
      // When a model returns audio URLs later, they can populate audioUrl.
      const script = narrationSegments.map((segment) => segment.text).join(" ");
      const variants: AudioVariant[] = [
        {
          id: `audio-${Date.now()}-calm`,
          label: t("workflow.caption.audioCalm"),
          createdAt: Date.now(),
          note: t("workflow.caption.audioCalmNote"),
        },
        {
          id: `audio-${Date.now()}-warm`,
          label: t("workflow.caption.audioWarm"),
          createdAt: Date.now() + 1,
          note: t("workflow.caption.audioWarmNote"),
        },
        {
          id: `audio-${Date.now()}-bright`,
          label: t("workflow.caption.audioBright"),
          createdAt: Date.now() + 2,
          note: t("workflow.caption.audioBrightNote"),
        },
      ];

      // Exercise the configured voice model when available; keep local variants on failure.
      try {
        await poeChatJson<{ ok?: boolean }>({
          apiKey,
          model: voiceModel,
          maxTokens: 200,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "Prepare three calm educational voiceover delivery styles for the same public-safety learning script. Return JSON {\"ok\":true}. Do not invent facts.",
            },
            {
              role: "user",
              content: `Script:\n${script}\nStyles: calm, warm, bright.`,
            },
          ],
        });
      } catch {
        // Keep local variants even if voice model cannot return audio assets yet.
      }

      setAudioVariants(variants);
      setSelectedAudioVariantId(variants[0].id);
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-full text-muted-foreground"
          onClick={() => goToStep("workbench")}
        >
          <ArrowLeft />
          {t("workflow.back")}
        </Button>
        <Button
          className="rounded-full px-5"
          disabled={!narrationConfirmed || !selectedAudioVariantId}
          onClick={() => goToStep("export")}
        >
          {t("workflow.caption.continue")}
          <ArrowRight />
        </Button>
      </div>

      <div className="mt-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {t("workflow.caption.eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
          {t("workflow.caption.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("workflow.caption.description")}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Mic2 className="size-4 text-primary" />
              {t("workflow.caption.variantsTitle")}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void generateNarration()}
              disabled={!confirmedImages.length || isGenerating}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {isGenerating
                ? t("workflow.caption.generating")
                : t("workflow.caption.generate")}
            </Button>
          </div>

          {!narrationSegments.length ? (
            <div className="mt-6 grid min-h-64 place-items-center rounded-2xl bg-muted/40 px-6 text-center">
              <div>
                <Mic2 className="mx-auto size-7 text-primary" />
                <p className="mt-3 text-sm font-bold text-foreground">
                  {t("workflow.caption.emptyTitle")}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {t("workflow.caption.emptyDescription")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {narrationSegments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="rounded-2xl bg-muted/45 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-primary">
                      {t("workflow.caption.scene", { number: index + 1 })}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {segment.startSeconds}s · {segment.durationSeconds}s
                    </div>
                  </div>
                  <textarea
                    value={segment.text}
                    onChange={(event) =>
                      updateSegment(segment.id, { text: event.target.value })
                    }
                    rows={2}
                    disabled={narrationConfirmed}
                    className="mt-2 w-full resize-y rounded-xl border border-transparent bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-border disabled:opacity-80"
                  />
                  <div className="mt-2 flex gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {t("workflow.caption.startLabel")}
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={segment.startSeconds}
                        onChange={(event) =>
                          updateSegment(segment.id, {
                            startSeconds: Number(event.target.value),
                          })
                        }
                        className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-foreground"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {t("workflow.caption.durationLabel")}
                      <input
                        type="number"
                        min={1}
                        step={0.5}
                        value={segment.durationSeconds}
                        onChange={(event) =>
                          updateSegment(segment.id, {
                            durationSeconds: Number(event.target.value),
                          })
                        }
                        className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-foreground"
                      />
                    </label>
                  </div>
                </div>
              ))}
              {!narrationConfirmed && (
                <Button
                  className="w-full rounded-2xl"
                  onClick={confirmNarration}
                >
                  <Check />
                  {t("workflow.caption.confirmNarration")}
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Volume2 className="size-4 text-primary" />
            {t("workflow.caption.audioTitle")}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t("workflow.caption.audioDescription")}
          </p>

          {!narrationConfirmed ? (
            <div className="mt-6 rounded-2xl bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
              {t("workflow.caption.confirmFirst")}
            </div>
          ) : (
            <>
              <Button
                className="mt-4 w-full rounded-2xl"
                disabled={isGeneratingAudio}
                onClick={() => void generateAudioVariants()}
              >
                {isGeneratingAudio ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Volume2 />
                )}
                {isGeneratingAudio
                  ? t("workflow.caption.generatingAudio")
                  : t("workflow.caption.generateVoiceover")}
              </Button>

              <div className="mt-4 space-y-2">
                {audioVariants.map((variant) => {
                  const selected = selectedAudioVariantId === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedAudioVariantId(variant.id)}
                      className={cn(
                        "w-full rounded-2xl px-3.5 py-3 text-left transition-colors",
                        selected
                          ? "bg-accent text-accent-foreground ring-1 ring-primary/30"
                          : "bg-muted/50 hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{variant.label}</span>
                        {selected && <Check className="size-4 text-primary" />}
                      </div>
                      {variant.note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {variant.note}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
