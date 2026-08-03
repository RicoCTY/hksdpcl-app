import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useProjectStore } from "@/store/projectStore";
import companyLogo from "@/assets/company-logo.png";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const view = useProjectStore((s) => s.view);

  return (
    <div className="flex h-full min-h-0 bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-card">
        <TopBar title={title} />
        <div className="aurora-wash relative min-h-0 flex-1 overflow-auto">
          {view === "home" && (
            <img
              src={companyLogo}
              alt=""
              aria-hidden="true"
              className="home-watermark pointer-events-none absolute right-[-4rem] bottom-[-6rem] z-0 size-[min(52vw,32rem)] select-none object-contain"
            />
          )}
          <div className="relative z-10 min-h-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
