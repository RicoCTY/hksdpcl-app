import { X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { cn } from "@/lib/utils";
import { DESIGN_FIELDS } from "@/lib/storyboardAgent";
import { useProjectStore, type StoryDesign } from "@/store/projectStore";

interface DesignSheetProps {
  open: boolean;
  onClose: () => void;
}

export function DesignSheet({ open, onClose }: DesignSheetProps) {
  const { t } = useTranslation();
  const storyDesign = useProjectStore((s) => s.storyDesign);

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
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("workflow.workbench.closeDesign")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {DESIGN_FIELDS.map((field) => (
            <label key={field} className="block">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {t(`workflow.workbench.design.${field}`)}
              </span>
              <AutoGrowTextarea
                readOnly
                tabIndex={-1}
                value={storyDesign[field as keyof StoryDesign]}
                className="mt-1.5 w-full cursor-default rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-xs leading-relaxed text-foreground outline-none"
              />
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}
