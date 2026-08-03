import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/store/projectStore";

interface ThemeSwitchProps {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
  lightLabel: string;
  darkLabel: string;
  className?: string;
}

export function ThemeSwitch({
  value,
  onChange,
  lightLabel,
  darkLabel,
  className,
}: ThemeSwitchProps) {
  const isDark = value === "dark";
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative flex items-center gap-1 rounded-xl bg-muted p-1",
        className,
      )}
      role="group"
      aria-label={`${lightLabel} / ${darkLabel}`}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-card shadow-sm ring-1 ring-border"
        animate={{ x: isDark ? "100%" : "0%" }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
      />
      <button
        type="button"
        onClick={() => onChange("light")}
        className={cn(
          "relative z-10 flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
          !isDark
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={!isDark}
      >
        <Sun className="size-3.5" />
        {lightLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("dark")}
        className={cn(
          "relative z-10 flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
          isDark
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={isDark}
      >
        <Moon className="size-3.5" />
        {darkLabel}
      </button>
    </div>
  );
}
