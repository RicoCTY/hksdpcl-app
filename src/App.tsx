import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/AppShell";
import { CaptionAudioStep } from "@/components/steps/CaptionAudioStep";
import { ExportStep } from "@/components/steps/ExportStep";
import { FormatStep } from "@/components/steps/FormatStep";
import { StoryboardWorkbench } from "@/components/steps/StoryboardWorkbench";
import { HistoryView } from "@/components/views/HistoryView";
import { CharactersView } from "@/components/views/CharactersView";
import { SettingsView } from "@/components/views/SettingsView";
import { useProjectStore } from "@/store/projectStore";

export default function App() {
  const { t } = useTranslation();
  const view = useProjectStore((s) => s.view);
  const step = useProjectStore((s) => s.step);
  const reduceMotion = useReducedMotion();

  let title = t(`steps.${step}`);
  if (view === "settings") title = t("settings.title");
  if (view === "history") title = t("nav.history");
  if (view === "characters") title = t("nav.characters");

  let content = <FormatStep />;
  if (view === "settings") {
    content = <SettingsView />;
  } else if (view === "history") {
    content = <HistoryView />;
  } else if (view === "characters") {
    content = <CharactersView />;
  } else {
    switch (step) {
      case "format":
        content = <FormatStep />;
        break;
      case "workbench":
        content = <StoryboardWorkbench />;
        break;
      case "caption_audio":
        content = <CaptionAudioStep />;
        break;
      case "export":
        content = <ExportStep />;
        break;
    }
  }

  const contentKey = view === "home" ? `home-${step}` : view;
  const isWorkflowSwitch =
    view === "home" && (step === "workbench" || step === "caption_audio");
  const isFixedHeightView = isWorkflowSwitch || view === "settings";

  return (
    <AppShell title={title}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={contentKey}
          className={isFixedHeightView ? "h-full min-h-0" : undefined}
          initial={
            reduceMotion
              ? false
              : { opacity: 0, y: isFixedHeightView ? 10 : 0 }
          }
          animate={{ opacity: 1, y: 0 }}
          exit={
            reduceMotion
              ? undefined
              : { opacity: 0, y: isFixedHeightView ? -8 : 0 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
          }
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
