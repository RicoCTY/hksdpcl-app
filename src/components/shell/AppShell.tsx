import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import companyLogo from "@/assets/company-logo.png";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "hksdpcl.sidebar-collapsed";

function getInitialSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function AppShell({ title, children }: AppShellProps) {
  const view = useProjectStore((s) => s.view);
  const step = useProjectStore((s) => s.step);
  const isWorkbench = view === "home" && step === "workbench";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarCollapsed,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        String(sidebarCollapsed),
      );
    } catch {
      // Sidebar preference is optional when local storage is unavailable.
    }
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-full min-h-0 bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-card">
        {view !== "settings" && <TopBar title={title} />}
        <div
          className={cn(
            "aurora-wash relative min-h-0 flex-1",
            view === "settings" || isWorkbench
              ? "overflow-hidden"
              : "overflow-auto",
          )}
        >
          {(view === "home" || view === "characters") && !isWorkbench && (
            <img
              src={companyLogo}
              alt=""
              aria-hidden="true"
              className="home-watermark pointer-events-none fixed right-[-4rem] bottom-[-6rem] z-0 size-[min(52vw,32rem)] select-none object-contain"
            />
          )}
          <div
            className={cn(
              "relative z-10",
              view === "settings" || isWorkbench ? "h-full min-h-0" : "min-h-full",
            )}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
