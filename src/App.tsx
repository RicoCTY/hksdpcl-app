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

  return <AppShell title={title}>{content}</AppShell>;
}
