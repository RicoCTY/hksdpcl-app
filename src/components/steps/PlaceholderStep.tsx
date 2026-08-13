import { ArrowLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/projectStore";

export function PlaceholderStep() {
  const { t } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const goToStep = useProjectStore((s) => s.goToStep);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
        <Sparkles className="size-6" />
      </div>
      <p className="mt-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">
        {t("placeholder.comingSoon")}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
        {t("placeholder.title")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t("placeholder.body")}
      </p>
      {(format || aspectRatio) && (
        <p className="mt-4 rounded-full bg-muted px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          {format} · {aspectRatio}
        </p>
      )}
      <Button
        variant="outline"
        className="mt-8 rounded-full"
        onClick={() => goToStep("workbench")}
      >
        <ArrowLeft className="size-4" />
        {t("placeholder.back")}
      </Button>
    </div>
  );
}
