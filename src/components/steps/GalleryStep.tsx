import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  ScanEye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepHeader } from "@/components/steps/StepHeader";
import { IMAGE_VARIANTS } from "@/components/steps/workflowData";
import { MockImagePreview } from "@/components/steps/ImagesStep";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

export function GalleryStep() {
  const { t } = useTranslation();
  const selectedImageId = useProjectStore((s) => s.selectedImageId);
  const setSelectedImageId = useProjectStore((s) => s.setSelectedImageId);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const goToStep = useProjectStore((s) => s.goToStep);

  const activeId = selectedImageId ?? IMAGE_VARIANTS[0].id;
  const activeVariant =
    IMAGE_VARIANTS.find((variant) => variant.id === activeId) ??
    IMAGE_VARIANTS[0];

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10">
      <StepHeader
        eyebrow={t("workflow.gallery.eyebrow")}
        title={t("workflow.gallery.title")}
        description={t("workflow.gallery.description")}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => goToStep("images")}
          >
            <ArrowLeft />
            {t("workflow.back")}
          </Button>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <MockImagePreview
              variant={activeVariant}
              className={cn(
                "w-full rounded-xl",
                aspectRatio === "3:2" ? "aspect-[3/2]" : "aspect-[2/3]",
              )}
            />
          </CardContent>
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              {t("workflow.gallery.selected")}
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {aspectRatio}
            </span>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                <ScanEye className="size-4.5" />
              </div>
              <CardTitle>{t("workflow.gallery.variantsTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {IMAGE_VARIANTS.map((variant) => {
              const selected = activeId === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedImageId(variant.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                    selected
                      ? "border-primary bg-accent/60"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <MockImagePreview
                    variant={variant}
                    className="size-14 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1 text-sm font-bold text-foreground">
                    {t(variant.labelKey)}
                  </span>
                  {selected && <CheckCircle2 className="size-4 text-primary" />}
                </button>
              );
            })}
            <Button
              variant="outline"
              className="mt-2 w-full rounded-2xl"
              onClick={() => goToStep("images")}
            >
              <Pencil />
              {t("workflow.gallery.editPrompt")}
            </Button>
            <Button
              className="w-full rounded-2xl"
              onClick={() => goToStep("caption_audio")}
            >
              {t("workflow.gallery.continue")}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
