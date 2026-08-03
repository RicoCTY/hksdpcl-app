import { useTranslation } from "react-i18next";
import {
  Clock3,
  Home,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import companyLogo from "@/assets/company-logo.png";

export function Sidebar() {
  const { t } = useTranslation();
  const view = useProjectStore((s) => s.view);
  const setView = useProjectStore((s) => s.setView);
  const themeMode = useProjectStore((s) => s.themeMode);
  const setThemeMode = useProjectStore((s) => s.setThemeMode);

  return (
    <aside className="flex h-full w-[244px] shrink-0 flex-col bg-background p-4">
      <div className="mb-5 flex items-center gap-3 px-2 pt-1">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-border">
          <img
            src={companyLogo}
            alt={t("app.logoAlt")}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight">
            {t("app.name")}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {t("app.council")}
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder={t("nav.searchPlaceholder")}
          readOnly
          aria-label={t("nav.searchPlaceholder")}
        />
      </div>

      <nav className="grid gap-1">
        <button
          type="button"
          onClick={() => setView("home")}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
            view === "home"
              ? "bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted",
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
          {t("nav.home")}
        </button>

        <button
          type="button"
          onClick={() => setView("characters")}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
            view === "characters"
              ? "bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted",
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
          {t("nav.characters")}
        </button>

        <button
          type="button"
          onClick={() => setView("history")}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
            view === "history"
              ? "bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Clock3
            className={cn(
              "size-[18px]",
              view === "history" ? "text-primary" : "text-muted-foreground",
            )}
          />
          {t("nav.history")}
        </button>
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-hidden border-t border-border pt-4">
        <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {t("nav.recent")}
        </div>
        <p className="px-3 text-xs leading-relaxed text-muted-foreground">
          {t("nav.emptyHistory")}
        </p>
      </div>

      <div className="mt-auto space-y-2 border-t border-border pt-3">
        <ThemeSwitch
          value={themeMode}
          onChange={setThemeMode}
          lightLabel={t("theme.light")}
          darkLabel={t("theme.dark")}
          className="w-full"
        />

        <button
          type="button"
          onClick={() => setView("settings")}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
            view === "settings"
              ? "bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Settings
            className={cn(
              "size-[18px]",
              view === "settings" ? "text-primary" : "text-muted-foreground",
            )}
          />
          {t("nav.settings")}
        </button>
      </div>
    </aside>
  );
}
