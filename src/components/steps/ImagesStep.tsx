import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  RefreshCw,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { IMAGE_VARIANTS } from "@/components/steps/workflowData";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

export function MockImagePreview({
  variant,
  className,
}: {
  variant: (typeof IMAGE_VARIANTS)[number];
  className?: string;
}) {
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ background: variant.background }}
    >
      <div
        className="absolute top-[12%] left-[12%] size-[34%] rounded-full opacity-75 blur-[1px]"
        style={{ background: variant.accent }}
      />
      <div
        className="absolute right-[12%] bottom-[14%] h-[42%] w-[42%] rounded-[45%_55%_55%_45%] opacity-70"
        style={{ background: variant.accent }}
      />
      <div className="absolute inset-x-[22%] bottom-[10%] h-[14%] rounded-full bg-black/20 blur-md" />
      <div className="absolute top-[18%] right-[17%] h-[56%] w-[22%] rotate-[18deg] rounded-full bg-black/15 blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/20" />
    </div>
  );
}

export function ImagesStep() {
  const { t } = useTranslation();
  const brief = useProjectStore((s) => s.brief);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const selectedImageId = useProjectStore((s) => s.selectedImageId);
  const setBriefField = useProjectStore((s) => s.setBriefField);
  const setSelectedImageId = useProjectStore((s) => s.setSelectedImageId);
  const goToStep = useProjectStore((s) => s.goToStep);
  const [isGenerating, setIsGenerating] = useState(false);

  const prompt =
    brief.imagePrompt || t("workflow.brief.defaults.imagePrompt");

  const generateVariations = () => {
    setIsGenerating(true);
    window.setTimeout(() => setIsGenerating(false), 700);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.images.eyebrow")}
        title={t("workflow.images.title")}
        description={t("workflow.images.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => goToStep("brief")}
            >
              <ArrowLeft />
              {t("workflow.back")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={generateVariations}
              disabled={isGenerating}
            >
              <RefreshCw className={isGenerating ? "animate-spin" : ""} />
              {isGenerating
                ? t("workflow.images.generating")
                : t("workflow.images.generate")}
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.7fr)]">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t("workflow.images.variationsTitle")}</CardTitle>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {t("workflow.images.ratioLabel")} · {aspectRatio}
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
            {IMAGE_VARIANTS.map((variant) => {
              const selected = selectedImageId === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedImageId(variant.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-2 text-left transition-all",
                    selected
                      ? "border-primary ring-4 ring-primary/10"
                      : "border-border hover:-translate-y-1 hover:border-primary/50",
                  )}
                >
                  <MockImagePreview
                    variant={variant}
                    className="aspect-[2/3]"
                  />
                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {t(variant.labelKey)}
                    </span>
                    {selected && (
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                <WandSparkles className="size-4.5" />
              </div>
              <CardTitle>{t("workflow.images.promptTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="image-prompt"
              className="text-sm font-semibold text-foreground"
            >
              {t("workflow.images.promptLabel")}
            </label>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(event) =>
                setBriefField("imagePrompt", event.target.value)
              }
              className="mt-2 min-h-36 w-full resize-y rounded-xl border border-border bg-muted/50 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5 text-primary" />
              {t("workflow.images.promptHint")}
            </div>
            <Button
              className="mt-5 w-full rounded-2xl"
              disabled={!selectedImageId}
              onClick={() => goToStep("gallery")}
            >
              {t("workflow.images.continue")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
