import { ArrowLeft, FileDown, Plus, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

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
  const workbenchDesignOpen = useProjectStore((s) => s.workbenchDesignOpen);
  const toggleWorkbenchDesignOpen = useProjectStore(
    (s) => s.toggleWorkbenchDesignOpen,
  );
  const characters = useProjectStore((s) => s.characters);
  const activeCharacterId = useProjectStore((s) => s.activeCharacterId);
  const createCharacter = useProjectStore((s) => s.createCharacter);
  const characterEditorSession = useProjectStore(
    (s) => s.characterEditorSession,
  );
  const reduceMotion = useReducedMotion();
  const isEditingCharacter = view === "characters" && Boolean(activeCharacterId);
  const showCreateCharacter =
    view === "characters" && !activeCharacterId && characters.length > 0;

  const showWorkflowChrome =
    view === "home" && (step === "workbench" || step === "caption_audio");
  const canExport = imagePages.some(
    (page) => page.selectedImageId || page.imageIds.length,
  );
  const showExportAction = showWorkflowChrome;

  const tabTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {isEditingCharacter ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-lg px-2.5 text-muted-foreground"
            onClick={() => characterEditorSession?.back()}
          >
            <ArrowLeft className="size-3.5" />
            {t("characters.back")}
          </Button>
        ) : view === "home" ? (
          <Input
            aria-label={t("nav.projectName")}
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder={t("nav.untitledProject")}
            maxLength={80}
            className="h-9 w-52 max-w-[36vw] rounded-lg border-transparent bg-transparent px-2.5 text-[15px] font-medium leading-none text-foreground caret-primary shadow-none outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:border-transparent focus-visible:bg-muted/50"
          />
        ) : (
          <div className="truncate px-2.5 text-[15px] font-medium text-foreground">
            {title}
          </div>
        )}
      </div>

      {showWorkflowChrome && (
        <nav
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-muted/60 p-1"
          aria-label={t("workflow.workbench.viewSwitch")}
          role="tablist"
        >
          {(
            [
              { id: "workbench" as const, label: t("workflow.workbench.boardTab") },
              {
                id: "caption_audio" as const,
                label: t("workflow.workbench.narrationAudio"),
              },
            ] as const
          ).map((tab) => {
            const selected = step === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => goToStep(tab.id)}
                className={cn(
                  "relative z-10 h-8 rounded-full px-4 text-[13px] font-medium outline-none transition-colors",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="workflow-tab-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-card shadow-sm ring-1 ring-border/70"
                    transition={tabTransition}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {isEditingCharacter && (
          <Button
            size="sm"
            className="h-9 rounded-lg px-3"
            disabled={!characterEditorSession?.canSave}
            title={
              characterEditorSession?.canSave
                ? undefined
                : t("characters.completeHint")
            }
            onClick={() => characterEditorSession?.done()}
          >
            {t("characters.done")}
          </Button>
        )}
        {showCreateCharacter && (
          <Button
            size="sm"
            className="h-9 rounded-lg px-3"
            onClick={() => createCharacter()}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{t("characters.create")}</span>
          </Button>
        )}
        {showExportAction && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="flex items-center gap-1.5"
          >
            {step === "workbench" && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 rounded-lg px-3 text-muted-foreground",
                  workbenchDesignOpen && "bg-muted text-foreground",
                )}
                aria-pressed={workbenchDesignOpen}
                onClick={() => toggleWorkbenchDesignOpen()}
              >
                <SlidersHorizontal className="size-3.5" />
                <span className="hidden sm:inline">
                  {t("workflow.workbench.designShort")}
                </span>
              </Button>
            )}
            <Button
              variant={canExport ? "default" : "ghost"}
              size="sm"
              className="h-9 rounded-lg px-3"
              disabled={!canExport}
              onClick={() => goToStep("export")}
            >
              <FileDown className="size-3.5" />
              <span className="hidden sm:inline">
                {step === "caption_audio"
                  ? t("workflow.caption.continue")
                  : t("workflow.workbench.exportAll")}
              </span>
            </Button>
          </motion.div>
        )}
      </div>
    </header>
  );
}
