import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownAZ,
  Clock3,
  FileText,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Moon,
  Sun,
  Trash2,
  Home,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { cn } from "@/lib/utils";
import { useProjectStore, type ProjectRecord } from "@/store/projectStore";
import companyLogo from "@/assets/company-logo.png";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const view = useProjectStore((s) => s.view);
  const setView = useProjectStore((s) => s.setView);
  const themeMode = useProjectStore((s) => s.themeMode);
  const setThemeMode = useProjectStore((s) => s.setThemeMode);
  const projects = useProjectStore((s) => s.projects);
  const projectId = useProjectStore((s) => s.projectId);
  const loadProject = useProjectStore((s) => s.loadProject);
  const projectSort = useProjectStore((s) => s.projectSort);
  const setProjectSort = useProjectStore((s) => s.setProjectSort);
  const renameProject = useProjectStore((s) => s.renameProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const activeCharacterId = useProjectStore((s) => s.activeCharacterId);
  const characterEditorSession = useProjectStore(
    (s) => s.characterEditorSession,
  );
  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearchOnExpand = useRef(false);

  const navigate = (action: () => void) => {
    if (activeCharacterId && characterEditorSession) {
      characterEditorSession.requestLeave(action);
      return;
    }
    action();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target;
      const projectMenu =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-project-menu]")
          : null;
      if (projectMenu?.dataset.projectMenu === openMenuId) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [openMenuId]);

  useEffect(() => {
    if (collapsed || !focusSearchOnExpand.current) return;
    focusSearchOnExpand.current = false;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [collapsed]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...projects]
      .filter((project) => {
        if (!normalizedQuery) return true;
        return [project.name, project.ideaText, project.format ?? ""]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (projectSort === "name") {
          return (a.name || t("nav.untitledProject")).localeCompare(
            b.name || t("nav.untitledProject"),
            undefined,
            { sensitivity: "base" },
          );
        }
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, 8);
  }, [projects, projectSort, query, t]);

  const openRename = (project: ProjectRecord) => {
    setOpenMenuId(null);
    setRenameTarget(project);
    setRenameValue(project.name);
  };

  const toggleSidebar = () => {
    setOpenMenuId(null);
    onToggle();
  };

  const expandToSearch = () => {
    focusSearchOnExpand.current = true;
    toggleSidebar();
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-background transition-[width,padding] duration-200",
        collapsed ? "w-[76px] p-3" : "w-[244px] p-4",
      )}
    >
      <div
      className={cn(
        "mb-5",
        collapsed
            ? "flex justify-center"
            : "flex items-center gap-3 px-2 pt-1",
      )}
      >
        {collapsed ? (
          <div className="group relative grid size-10 place-items-center overflow-hidden rounded-xl">
            <img
              src={companyLogo}
              alt={t("app.logoAlt")}
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={toggleSidebar}
              className="absolute inset-0 grid place-items-center bg-background/85 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t("nav.expandSidebar")}
              title={t("nav.expandSidebar")}
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden">
              <img
                src={companyLogo}
                alt={t("app.logoAlt")}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-foreground">
                {t("app.shortName")}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("nav.collapseSidebar")}
              title={t("nav.collapseSidebar")}
            >
              <PanelLeftClose className="size-4" />
            </button>
          </>
        )}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={expandToSearch}
          className="mb-4 grid size-10 self-center place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("nav.searchPlaceholder")}
          title={t("nav.searchPlaceholder")}
        >
          <Search className="size-[18px]" />
        </button>
      ) : (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            className="h-10 pl-9"
            placeholder={t("nav.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t("nav.searchPlaceholder")}
          />
        </div>
      )}

      <nav className="grid gap-1">
        <button
          type="button"
          onClick={() => navigate(() => setView("home"))}
          title={collapsed ? t("nav.home") : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl text-sm font-semibold outline-none transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            view === "home"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/70",
          )}
        >
          <Home
            className={cn(
              "size-[18px]",
              view === "home"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          />
          {!collapsed && t("nav.home")}
        </button>

        <button
          type="button"
          onClick={() => navigate(() => setView("characters"))}
          title={collapsed ? t("nav.characters") : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl text-sm font-semibold outline-none transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            view === "characters"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/70",
          )}
        >
          <UsersRound
            className={cn(
              "size-[18px]",
              view === "characters"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          />
          {!collapsed && t("nav.characters")}
        </button>

      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto border-t border-border pt-4">
        {!collapsed && <div className="mb-2 flex items-center justify-between px-3">
          <div className="text-sm font-bold tracking-wide text-muted-foreground">
            {query ? t("nav.searchResults") : t("nav.recent")}
          </div>
          <div className="flex items-center gap-1">
            {query && <span className="mr-1 text-sm font-semibold tabular-nums text-muted-foreground">{visibleProjects.length}</span>}
            <button
              type="button"
              onClick={() => setProjectSort(projectSort === "updated" ? "name" : "updated")}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={projectSort === "updated" ? t("nav.sortByName") : t("nav.sortByUpdated")}
              title={projectSort === "updated" ? t("nav.sortByName") : t("nav.sortByUpdated")}
            >
              {projectSort === "updated" ? <Clock3 className="size-3.5" /> : <ArrowDownAZ className="size-3.5" />}
            </button>
          </div>
        </div>}
        <div className="grid gap-1">
          {visibleProjects.map((project) => {
            const displayName = project.name || t("nav.untitledProject");
            return (
              <div
                key={project.id}
                className="group relative"
                data-project-menu={project.id}
              >
                <button
                  type="button"
                  onClick={() => {
                    navigate(() => {
                      loadProject(project.id);
                      setQuery("");
                      setOpenMenuId(null);
                    });
                  }}
                  title={collapsed ? displayName : undefined}
                  className={cn(
                    "flex min-w-0 w-full items-center gap-2 rounded-lg py-2 text-left transition-colors",
                    collapsed ? "justify-center px-0" : "px-3 pr-10",
                    project.id === projectId
                      ? "bg-accent text-foreground hover:bg-accent dark:bg-accent/70 dark:text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <FileText className="size-4 shrink-0" />
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-xs font-medium">{displayName}</span>}
                </button>
                {!collapsed && <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId(openMenuId === project.id ? null : project.id);
                  }}
                  className={cn(
                    "absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground outline-none transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100",
                    openMenuId === project.id
                      ? "bg-muted text-foreground opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                  aria-label={t("nav.projectActions", { name: displayName })}
                  aria-expanded={openMenuId === project.id}
                  aria-haspopup="menu"
                >
                  <MoreHorizontal className="size-4" />
                </button>}
                {openMenuId === project.id && (
                  <div
                    role="menu"
                    className="absolute top-10 right-1 z-20 min-w-[10.5rem] rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openRename(project)}
                      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                      {t("nav.renameProject")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        setDeleteTarget(project);
                      }}
                      className="sidebar-delete-action flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors"
                    >
                      <Trash2 className="size-4" />
                      {t("nav.deleteProject")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!collapsed && !visibleProjects.length && (
          <p className="px-3 text-xs leading-relaxed text-muted-foreground">
            {t("nav.noSearchResults")}
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-border pt-3">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
            className="grid size-11 w-full place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={themeMode === "light" ? t("theme.dark") : t("theme.light")}
            title={themeMode === "light" ? t("theme.dark") : t("theme.light")}
          >
            {themeMode === "light" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
          </button>
        ) : (
          <ThemeSwitch
            value={themeMode}
            onChange={setThemeMode}
            lightLabel={t("theme.light")}
            darkLabel={t("theme.dark")}
            className="w-full"
          />
        )}

        <button
          type="button"
          onClick={() => navigate(() => setView("settings"))}
          title={collapsed ? t("nav.settings") : undefined}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-xl text-sm font-semibold outline-none transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            view === "settings"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/70",
          )}
        >
          <Settings
            className={cn(
              "size-[18px]",
              view === "settings" ? "text-primary" : "text-muted-foreground",
            )}
          />
          {!collapsed && t("nav.settings")}
        </button>
      </div>

      {renameTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameTarget(null); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="rename-project-title" onSubmit={(event) => { event.preventDefault(); renameProject(renameTarget.id, renameValue); setRenameTarget(null); }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="rename-project-title" className="text-lg font-bold text-foreground">{t("nav.renameProjectTitle")}</h2>
            <label htmlFor="rename-project-input" className="mt-4 block text-sm font-semibold text-foreground">{t("nav.projectName")}</label>
            <Input id="rename-project-input" autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="mt-2" />
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRenameTarget(null)} className="h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted">{t("nav.cancel")}</button><button type="submit" disabled={!renameValue.trim()} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{t("nav.saveName")}</button></div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="delete-project-title" className="text-lg font-bold text-foreground">{t("nav.deleteProjectTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("nav.deleteProjectConfirm", { name: deleteTarget.name || t("nav.untitledProject") })}</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted">{t("nav.cancel")}</button><button type="button" onClick={() => { deleteProject(deleteTarget.id); setDeleteTarget(null); }} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">{t("nav.deleteAction")}</button></div>
          </div>
        </div>
      )}
    </aside>
  );
}
