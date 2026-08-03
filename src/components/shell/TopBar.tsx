import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectStore, type AgentStep } from "@/store/projectStore";

const WORKFLOW_STEPS: readonly AgentStep[] = [
  "format",
  "idea",
  "brief",
  "images",
  "gallery",
  "caption_audio",
  "export",
];

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const newProject = useProjectStore((s) => s.newProject);
  const setView = useProjectStore((s) => s.setView);
  const view = useProjectStore((s) => s.view);
  const step = useProjectStore((s) => s.step);
  const goToStep = useProjectStore((s) => s.goToStep);

  const currentStepIndex = WORKFLOW_STEPS.indexOf(step);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-7">
      <div className="flex min-w-0 items-center gap-4">
        <div className="truncate text-base font-semibold text-foreground">
          {title}
        </div>
        {view === "home" && (
          <div
            className="hidden items-center gap-1.5 md:flex"
            aria-label={t("workflow.progressLabel")}
          >
            {WORKFLOW_STEPS.map((workflowStep, index) => {
              const complete = index < currentStepIndex;
              const active = index === currentStepIndex;
              return (
                <button
                  key={workflowStep}
                  type="button"
                  disabled={index > currentStepIndex}
                  onClick={() => goToStep(workflowStep)}
                  aria-label={t(`steps.${workflowStep}`)}
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-bold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : complete
                        ? "bg-accent text-accent-foreground hover:bg-accent/80"
                        : "bg-muted text-muted-foreground disabled:cursor-default",
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full px-4"
        onClick={() => {
          newProject();
          setView("home");
        }}
      >
        <Plus className="size-4" />
        {t("nav.newProject")}
      </Button>
    </header>
  );
}
