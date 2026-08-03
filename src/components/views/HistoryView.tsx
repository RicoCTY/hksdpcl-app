import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HistoryView() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Clock3 className="size-6" />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight">
        {t("nav.history")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("nav.emptyHistory")}</p>
    </div>
  );
}
