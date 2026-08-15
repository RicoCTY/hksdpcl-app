import { motion } from "framer-motion";
import { Check, ImageIcon, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectStore, type ContentFormat } from "@/store/projectStore";

export function FormatStep() {
  const { t } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const setFormat = useProjectStore((s) => s.setFormat);
  const confirmFormat = useProjectStore((s) => s.confirmFormat);

  const cards: {
    id: ContentFormat;
    icon: typeof Smartphone;
    title: string;
    ratioLabel: string;
  }[] = [
    {
      id: "story",
      icon: Smartphone,
      title: t("format.story"),
      ratioLabel: "9:16",
    },
    {
      id: "post",
      icon: ImageIcon,
      title: t("format.post"),
      ratioLabel: "4:5",
    },
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 pt-14 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
      <div className="flex flex-1 flex-col items-center rounded-[2rem] bg-muted/40 px-5 py-8 sm:px-8 sm:py-10">
        <motion.div
          className="text-center"
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <p className="text-xs font-semibold text-muted-foreground">
            {t("steps.format")}
          </p>
          <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight text-foreground">
            {t("format.headlineBefore")}{" "}
            <span className="gradient-text">{t("format.headlineAccent")}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("format.subtitle")}
          </p>
        </motion.div>

        <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          {cards.map((card, index) => {
            const selected = format === card.id;
            const Icon = card.icon;
            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => setFormat(card.id)}
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.08 + index * 0.05, duration: 0.35 }}
                whileHover={{ y: -2 }}
                className={cn(
                  "relative rounded-[1.75rem] bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-colors",
                  selected
                    ? "ring-2 ring-primary/35"
                    : "ring-1 ring-border/70 hover:ring-orange-200",
                )}
              >
                {selected && (
                  <span className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-primary text-white">
                    <Check className="size-3.5" />
                  </span>
                )}
                <div
                  className={cn(
                    "mb-4 grid size-11 place-items-center rounded-2xl",
                    selected
                      ? "bg-accent text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="text-[clamp(1.25rem,2.2vw,1.5rem)] font-extrabold tracking-tight">
                  {card.title}
                </div>
                <div className="mt-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {card.ratioLabel}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="min-w-44 rounded-full"
            disabled={!format}
            onClick={confirmFormat}
          >
            {t("format.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
