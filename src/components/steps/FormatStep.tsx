import { motion } from "framer-motion";
import { Check, ImageIcon, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useProjectStore,
  type AspectRatio,
  type ContentFormat,
} from "@/store/projectStore";

export function FormatStep() {
  const { t } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const setFormat = useProjectStore((s) => s.setFormat);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const confirmFormat = useProjectStore((s) => s.confirmFormat);

  const cards: {
    id: ContentFormat;
    icon: typeof Smartphone;
    title: string;
    desc: string;
    ratioLabel: string;
  }[] = [
    {
      id: "story",
      icon: Smartphone,
      title: t("format.story"),
      desc: t("format.storyDesc"),
      ratioLabel:
        format === "story" ? (aspectRatio ?? "9:16 / 2:3") : "9:16 / 2:3",
    },
    {
      id: "post",
      icon: ImageIcon,
      title: t("format.post"),
      desc: t("format.postDesc"),
      ratioLabel: format === "post" ? (aspectRatio ?? "1:1") : "1:1 / 3:2",
    },
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-6 py-6">
      <motion.div
        className="text-center"
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
      >
        <h1 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight text-foreground">
          {t("format.headlineBefore")}{" "}
          <span className="gradient-text">{t("format.headlineAccent")}</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("format.subtitle")}
        </p>
      </motion.div>

      <div className="mt-7 grid w-full gap-4 sm:grid-cols-2">
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
              whileHover={{ y: -3 }}
              className={cn(
                "relative rounded-2xl border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-colors",
                selected
                  ? "border-primary/40 ring-4 ring-primary/10"
                  : "border-border hover:border-orange-200",
              )}
            >
              {selected && (
                <span className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-primary text-white">
                  <Check className="size-3.5" />
                </span>
              )}
              <div
                className={cn(
                  "mb-4 grid size-11 place-items-center rounded-xl",
                  selected
                    ? "bg-accent text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="text-base font-bold">{card.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {card.ratioLabel}
              </div>
            </motion.button>
          );
        })}
      </div>

      {format && (
        <motion.div
          className="mt-5 w-full"
          initial={{ y: 6 }}
          animate={{ y: 0 }}
        >
          <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
            {format === "story"
              ? t("format.storyRatioHint")
              : t("format.postRatioHint")}
          </p>
          <div className="mx-auto flex w-fit gap-1 rounded-xl bg-muted p-1">
            {(format === "story"
              ? (["9:16", "2:3"] as AspectRatio[])
              : (["1:1", "3:2"] as AspectRatio[])
            ).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "h-9 min-w-20 rounded-lg px-4 text-sm font-bold transition-colors",
                  aspectRatio === ratio
                    ? "bg-card text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {ratio}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-7 flex flex-col items-center gap-3">
        <Button
          size="lg"
          variant="secondary"
          className="min-w-44 rounded-full"
          disabled={!format || !aspectRatio}
          onClick={confirmFormat}
        >
          {t("format.continue")}
        </Button>
      </div>
    </div>
  );
}
