import {
  ArrowLeft,
  Check,
  FileDown,
  ImageIcon,
  MessageSquareText,
  Plus,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { IMAGE_VARIANTS } from "@/components/steps/workflowData";
import { MockImagePreview } from "@/components/steps/ImagesStep";
import { useProjectStore } from "@/store/projectStore";

export function ExportStep() {
  const { t } = useTranslation();
  const selectedImageId = useProjectStore((s) => s.selectedImageId);
  const selectedCaption = useProjectStore((s) => s.selectedCaption);
  const voiceoverGenerated = useProjectStore((s) => s.voiceoverGenerated);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const goToStep = useProjectStore((s) => s.goToStep);
  const newProject = useProjectStore((s) => s.newProject);
  const [exported, setExported] = useState(false);

  const activeVariant =
    IMAGE_VARIANTS.find((variant) => variant.id === selectedImageId) ??
    IMAGE_VARIANTS[0];
  const caption = selectedCaption || t("workflow.caption.options.one");

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.export.eyebrow")}
        title={t("workflow.export.title")}
        description={t("workflow.export.description")}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => goToStep("caption_audio")}
          >
            <ArrowLeft />
            {t("workflow.back")}
          </Button>
        }
      />

      <Card className="mt-8 overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t("workflow.export.packageTitle")}</CardTitle>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
              {t("workflow.export.ready")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <MockImagePreview
            variant={activeVariant}
            className={
              aspectRatio === "3:2"
                ? "aspect-[3/2] rounded-2xl"
                : "aspect-[2/3] rounded-2xl"
            }
          />
          <div className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ImageIcon,
                  label: t("workflow.export.image"),
                  value: aspectRatio,
                },
                {
                  icon: MessageSquareText,
                  label: t("workflow.export.caption"),
                  value: t("workflow.export.included"),
                },
                {
                  icon: Volume2,
                  label: t("workflow.export.audio"),
                  value: voiceoverGenerated
                    ? t("workflow.export.included")
                    : t("workflow.export.optional"),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-muted/50 p-3"
                >
                  <Icon className="size-4 text-primary" />
                  <div className="mt-3 text-xs font-semibold text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1 text-sm font-bold text-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
              <div className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {t("workflow.export.caption")}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {caption}
              </p>
            </div>
            {exported && (
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
                <Check className="size-4" />
                {t("workflow.export.exported")}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                className="rounded-2xl"
                onClick={() => setExported(true)}
              >
                <FileDown />
                {t("workflow.export.download")}
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={newProject}
              >
                <Plus />
                {t("workflow.export.newProject")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
