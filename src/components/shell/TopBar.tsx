import { ArrowLeft, FileDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore, type AgentStep } from "@/store/projectStore";

const PREVIOUS_STEP: Partial<Record<AgentStep, AgentStep>> = {
  // Format/aspect is locked after selection — it drives image generation size.
  caption_audio: "workbench",
  export: "workbench",
};

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const view = useProjectStore((s) => s.view);
  const step = useProjectStore((s) => s.step);
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const imagePages = useProjectStore((s) => s.imagePages);
  const goToStep = useProjectStore((s) => s.goToStep);
  const reduceMotion = useReducedMotion();

  const previousStep = PREVIOUS_STEP[step];
  const canExport =
    step === "workbench" &&
    imagePages.some((page) => page.selectedImageId || page.imageIds.length);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-6 sm:px-7">
      <div className="flex min-w-0 items-center gap-1.5">
        {view === "home" ? (
          <>
            {previousStep && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-muted-foreground"
                onClick={() => goToStep(previousStep)}
              >
                <ArrowLeft />
                {t("workflow.back")}
              </Button>
            )}
            <Input
              aria-label={t("nav.projectName")}
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder={t("nav.untitledProject")}
              maxLength={80}
              className="h-9 w-56 max-w-[42vw] overflow-x-auto rounded-lg border border-transparent bg-transparent px-3 text-base font-semibold leading-none text-foreground caret-primary shadow-none transition-colors placeholder:text-muted-foreground hover:bg-muted/60 focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:shadow-sm"
            />
          </>
        ) : (
          <div className="truncate text-base font-semibold text-foreground">
            {title}
          </div>
        )}
      </div>
      {view === "home" &&
        (step === "workbench" || step === "caption_audio") && (
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="tablist"
            aria-label={t("workflow.workbench.viewSwitch")}
            className="relative flex items-center rounded-full border border-border bg-muted/50 p-1"
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-sm ring-1 ring-border"
              animate={{ x: step === "caption_audio" ? "100%" : "0%" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 30 }
              }
            />
            <button
              type="button"
              role="tab"
              aria-selected={step === "workbench"}
              onClick={() => goToStep("workbench")}
              className={`relative z-10 flex h-8 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
                step === "workbench"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("workflow.workbench.storyDesign")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === "caption_audio"}
              onClick={() => goToStep("caption_audio")}
              className={`relative z-10 flex h-8 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
                step === "caption_audio"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("workflow.workbench.narrationAudio")}
            </button>
          </div>
          {step === "workbench" && (
            <Button
              className="rounded-full px-5"
              disabled={!canExport}
              onClick={() => goToStep("export")}
            >
              <FileDown />
              {t("workflow.workbench.exportAll")}
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
