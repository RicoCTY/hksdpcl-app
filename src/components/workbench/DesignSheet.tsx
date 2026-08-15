import { LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DESIGN_FIELDS } from "@/lib/storyboardAgent";
import { useProjectStore, type StoryDesign } from "@/store/projectStore";

interface DesignSheetProps {
  open: boolean;
  onClose: () => void;
  onRedesign: () => void;
  isGenerating: boolean;
}

export function DesignSheet({
  open,
  onClose,
  onRedesign,
  isGenerating,
}: DesignSheetProps) {
  const { t } = useTranslation();
  const storyDesign = useProjectStore((s) => s.storyDesign);
  const setStoryDesignField = useProjectStore((s) => s.setStoryDesignField);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex justify-end transition-opacity duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/15 outline-none"
        aria-label={t("workflow.workbench.closeDesign")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-sheet-title"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p
            id="design-sheet-title"
            className="text-sm font-semibold text-foreground"
          >
            {t("workflow.workbench.designTitle")}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={isGenerating}
              onClick={onRedesign}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {t("workflow.workbench.redesign")}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("workflow.workbench.closeDesign")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {DESIGN_FIELDS.map((field) => (
            <label key={field} className="block">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {t(`workflow.workbench.design.${field}`)}
              </span>
              <textarea
                value={storyDesign[field as keyof StoryDesign]}
                rows={field === "summary" || field === "style" ? 3 : 2}
                onChange={(event) =>
                  setStoryDesignField(field, event.target.value)
                }
                className="mt-1.5 w-full resize-y rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-border focus:bg-background"
              />
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}
