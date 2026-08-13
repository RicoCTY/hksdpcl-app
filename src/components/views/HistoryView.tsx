import { Clock3, FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/store/projectStore";

export function HistoryView() {
  const { t } = useTranslation();
  const projects = useProjectStore((s) => s.projects);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-8 sm:px-8">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">{t("nav.history")}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">{t("history.title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("history.description")}</p></div>
        <Button onClick={newProject} className="shrink-0 rounded-full"><Plus />{t("nav.newProject")}</Button>
      </div>
      {projects.length === 0 ? <div className="mt-8 grid min-h-80 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-center"><div><Clock3 className="mx-auto size-8 text-primary" /><p className="mt-4 text-sm font-bold text-foreground">{t("nav.emptyHistory")}</p></div></div> : <div className="mt-8 grid gap-3">{projects.map((project) => <Card key={project.id} className="overflow-hidden"><button type="button" onClick={() => loadProject(project.id)} className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><FileText className="size-4.5" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-foreground">{project.name || t("nav.untitledProject")}</div><div className="mt-1 truncate text-xs text-muted-foreground">{project.ideaText || t("history.noIdea")} · {project.format ? t(`format.${project.format}`) : t("history.notStarted")}</div></div><span className="text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString()}</span></button></Card>)}</div>}
    </div>
  );
}
