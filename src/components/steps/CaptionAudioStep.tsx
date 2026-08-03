import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mic2,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

export function CaptionAudioStep() {
  const { t } = useTranslation();
  const selectedCaption = useProjectStore((s) => s.selectedCaption);
  const setSelectedCaption = useProjectStore((s) => s.setSelectedCaption);
  const voiceoverGenerated = useProjectStore((s) => s.voiceoverGenerated);
  const setVoiceoverGenerated = useProjectStore(
    (s) => s.setVoiceoverGenerated,
  );
  const goToStep = useProjectStore((s) => s.goToStep);
  const [isPlaying, setIsPlaying] = useState(false);

  const captions = [
    t("workflow.caption.options.one"),
    t("workflow.caption.options.two"),
    t("workflow.caption.options.three"),
  ];
  const activeCaption = selectedCaption || captions[0];

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.caption.eyebrow")}
        title={t("workflow.caption.title")}
        description={t("workflow.caption.description")}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => goToStep("gallery")}
          >
            <ArrowLeft />
            {t("workflow.back")}
          </Button>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                <Sparkles className="size-4.5" />
              </div>
              <CardTitle>{t("workflow.caption.variantsTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {captions.map((caption, index) => {
              const selected = activeCaption === caption;
              return (
                <button
                  key={caption}
                  type="button"
                  onClick={() => setSelectedCaption(caption)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-accent/50"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed text-foreground">
                    {caption}
                  </span>
                  {selected && <Check className="mt-0.5 size-4 text-primary" />}
                </button>
              );
            })}
            <label
              htmlFor="selected-caption"
              className="block pt-2 text-sm font-bold text-foreground"
            >
              {t("workflow.caption.editLabel")}
            </label>
            <textarea
              id="selected-caption"
              value={activeCaption}
              onChange={(event) => setSelectedCaption(event.target.value)}
              className="min-h-28 w-full resize-y rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                <Mic2 className="size-4.5" />
              </div>
              <CardTitle>{t("workflow.caption.audioTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("workflow.caption.audioDescription")}
            </p>
            <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Volume2 className="size-4 text-primary" />
                  {t("workflow.caption.voiceover")}
                </div>
                <span className="text-xs text-muted-foreground">
                  {voiceoverGenerated
                    ? t("workflow.caption.ready")
                    : t("workflow.caption.optional")}
                </span>
              </div>
              {voiceoverGenerated ? (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground"
                    onClick={() => setIsPlaying((playing) => !playing)}
                    aria-label={t("workflow.caption.play")}
                  >
                    {isPlaying ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full w-2/5 rounded-full bg-primary" />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>0:18</span>
                      <span>0:45</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => setVoiceoverGenerated(true)}
                >
                  <Mic2 />
                  {t("workflow.caption.generateVoiceover")}
                </Button>
              )}
            </div>
            <Button
              className="mt-5 w-full rounded-2xl"
              onClick={() => {
                if (!selectedCaption) setSelectedCaption(captions[0]);
                goToStep("export");
              }}
            >
              {t("workflow.caption.continue")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
