import { ArrowLeft, ArrowRight, ImagePlus, Paperclip, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { useProjectStore } from "@/store/projectStore";

export function IdeaStep() {
  const { t } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const ideaText = useProjectStore((s) => s.ideaText);
  const referenceImageName = useProjectStore((s) => s.referenceImageName);
  const setIdeaText = useProjectStore((s) => s.setIdeaText);
  const setReferenceImageName = useProjectStore(
    (s) => s.setReferenceImageName,
  );
  const goToStep = useProjectStore((s) => s.goToStep);

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.idea.eyebrow")}
        title={t("workflow.idea.title")}
        description={t("workflow.idea.description")}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => goToStep("format")}
          >
            <ArrowLeft />
            {t("workflow.back")}
          </Button>
        }
      />

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle>{t("workflow.idea.promptTitle")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("workflow.idea.promptDescription")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="idea-text"
              className="text-sm font-semibold text-foreground"
            >
              {t("workflow.idea.promptLabel")}
            </label>
            <textarea
              id="idea-text"
              value={ideaText}
              onChange={(event) => setIdeaText(event.target.value)}
              placeholder={t("workflow.idea.promptPlaceholder")}
              className="mt-2 min-h-44 w-full resize-y rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setReferenceImageName(event.target.files?.[0]?.name ?? null)
                  }
                />
                <ImagePlus className="size-4" />
                {referenceImageName ?? t("workflow.idea.addReference")}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("workflow.idea.optional")}
              </span>
            </div>

            <Button
              className="mt-6 w-full rounded-2xl sm:w-auto"
              disabled={!ideaText.trim()}
              onClick={() => goToStep("brief")}
            >
              {t("workflow.idea.continue")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>

        <Card className="h-fit bg-muted/40">
          <CardHeader>
            <CardTitle>{t("workflow.context.title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("workflow.context.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {t("workflow.context.format")}
              </div>
              <div className="mt-1 text-sm font-bold text-foreground">
                {format === "story" ? t("format.story") : t("format.post")}{" "}
                <span className="font-medium text-muted-foreground">
                  {aspectRatio}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <Paperclip className="mb-2 size-4 text-primary" />
              {t("workflow.idea.referenceTip")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
