import { ArrowLeft, ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { useProjectStore, type CreativeBrief } from "@/store/projectStore";

function BriefField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-bold text-foreground"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-border bg-muted/50 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

export function BriefStep() {
  const { t } = useTranslation();
  const brief = useProjectStore((s) => s.brief);
  const setBriefField = useProjectStore((s) => s.setBriefField);
  const goToStep = useProjectStore((s) => s.goToStep);
  const [regenerated, setRegenerated] = useState(false);

  const defaults: CreativeBrief = {
    summary: t("workflow.brief.defaults.summary"),
    visualDirection: t("workflow.brief.defaults.visualDirection"),
    imagePrompt: t("workflow.brief.defaults.imagePrompt"),
    captionDirection: t("workflow.brief.defaults.captionDirection"),
  };

  const valueFor = (field: keyof CreativeBrief) =>
    brief[field] || defaults[field];

  const regenerateBrief = () => {
    Object.entries(defaults).forEach(([field, value]) => {
      setBriefField(field as keyof CreativeBrief, value);
    });
    setRegenerated(true);
  };

  const continueToImages = () => {
    Object.entries(defaults).forEach(([field, value]) => {
      if (!brief[field as keyof CreativeBrief]) {
        setBriefField(field as keyof CreativeBrief, value);
      }
    });
    goToStep("images");
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.brief.eyebrow")}
        title={t("workflow.brief.title")}
        description={t("workflow.brief.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => goToStep("idea")}
            >
              <ArrowLeft />
              {t("workflow.back")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={regenerateBrief}
            >
              <RefreshCw />
              {t("workflow.brief.regenerate")}
            </Button>
          </div>
        }
      />

      {regenerated && (
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          {t("workflow.brief.regenerated")}
        </div>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.7fr)]">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t("workflow.brief.editorTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5">
            <BriefField
              id="brief-summary"
              label={t("workflow.brief.fields.summary")}
              value={valueFor("summary")}
              onChange={(value) => setBriefField("summary", value)}
            />
            <BriefField
              id="brief-visual-direction"
              label={t("workflow.brief.fields.visualDirection")}
              value={valueFor("visualDirection")}
              onChange={(value) => setBriefField("visualDirection", value)}
            />
            <BriefField
              id="brief-image-prompt"
              label={t("workflow.brief.fields.imagePrompt")}
              value={valueFor("imagePrompt")}
              onChange={(value) => setBriefField("imagePrompt", value)}
            />
            <BriefField
              id="brief-caption-direction"
              label={t("workflow.brief.fields.captionDirection")}
              value={valueFor("captionDirection")}
              onChange={(value) => setBriefField("captionDirection", value)}
            />
          </CardContent>
        </Card>

        <Card className="h-fit bg-muted/40">
          <CardHeader>
            <CardTitle>{t("workflow.brief.reviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              t("workflow.brief.checks.concept"),
              t("workflow.brief.checks.visual"),
              t("workflow.brief.checks.prompt"),
              t("workflow.brief.checks.caption"),
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground"
              >
                <span className="grid size-5 place-items-center rounded-full bg-accent text-primary">
                  <Check className="size-3" />
                </span>
                {item}
              </div>
            ))}
            <Button className="mt-3 w-full rounded-2xl" onClick={continueToImages}>
              {t("workflow.brief.continue")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
