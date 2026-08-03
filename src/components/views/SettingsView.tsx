import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  Captions,
  Check,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Info,
  KeyRound,
  Languages,
  Lightbulb,
  Palette,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { setAppLocale, type AppLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import {
  useProjectStore,
  type ModelSettingKey,
} from "@/store/projectStore";
import { cn } from "@/lib/utils";

type SettingsSectionId = "general" | "models" | "appearance" | "about";

const modelFields: {
  key: ModelSettingKey;
  labelKey: string;
  descriptionKey: string;
  placeholderKey: string;
  icon: typeof Bot;
}[] = [
  {
    key: "idea",
    labelKey: "settings.models.ideaLabel",
    descriptionKey: "settings.models.ideaDescription",
    placeholderKey: "settings.models.ideaPlaceholder",
    icon: Lightbulb,
  },
  {
    key: "brief",
    labelKey: "settings.models.briefLabel",
    descriptionKey: "settings.models.briefDescription",
    placeholderKey: "settings.models.briefPlaceholder",
    icon: FileText,
  },
  {
    key: "images",
    labelKey: "settings.models.imagesLabel",
    descriptionKey: "settings.models.imagesDescription",
    placeholderKey: "settings.models.imagesPlaceholder",
    icon: ImageIcon,
  },
  {
    key: "captionAudio",
    labelKey: "settings.models.captionLabel",
    descriptionKey: "settings.models.captionDescription",
    placeholderKey: "settings.models.captionPlaceholder",
    icon: Captions,
  },
];

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: SettingsSectionId;
  icon: typeof Bot;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={`settings-${id}`} className="scroll-mt-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-4.5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { t, i18n } = useTranslation();
  const setView = useProjectStore((s) => s.setView);
  const poeApiKey = useProjectStore((s) => s.poeApiKey);
  const setPoeApiKey = useProjectStore((s) => s.setPoeApiKey);
  const themeMode = useProjectStore((s) => s.themeMode);
  const setThemeMode = useProjectStore((s) => s.setThemeMode);
  const modelSettings = useProjectStore((s) => s.modelSettings);
  const setModelSetting = useProjectStore((s) => s.setModelSetting);
  const [showPoeApiKey, setShowPoeApiKey] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");

  const locale = (i18n.language === "en" ? "en" : "zh-Hant") as AppLocale;

  const scrollToSection = (section: SettingsSectionId) => {
    setActiveSection(section);
    document
      .getElementById(`settings-${section}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const languageOptions: { id: AppLocale; label: string }[] = [
    { id: "zh-Hant", label: t("settings.languageZhHant") },
    { id: "en", label: t("settings.languageEnglish") },
  ];

  const navigation: {
    id: SettingsSectionId;
    label: string;
    icon: typeof Bot;
  }[] = [
    { id: "general", label: t("settings.navigation.general"), icon: KeyRound },
    { id: "models", label: t("settings.navigation.models"), icon: Cpu },
    {
      id: "appearance",
      label: t("settings.navigation.appearance"),
      icon: Palette,
    },
    { id: "about", label: t("settings.navigation.about"), icon: Info },
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8 xl:flex-row xl:gap-14 xl:px-10">
      <aside className="mb-9 shrink-0 xl:mb-0 xl:w-52">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
            {t("settings.eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
            {t("settings.title")}
          </h1>
        </div>

        <nav className="grid gap-1" aria-label={t("settings.title")}>
          {navigation.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors",
                  active
                    ? "bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-border pt-4">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {t("settings.versionLabel")}
          </p>
          <p className="mt-1 text-xs font-bold text-foreground">
            {t("settings.version", { version: packageJson.version })}
          </p>
        </div>
      </aside>

      <div className="min-w-0 max-w-2xl flex-1 space-y-10">
        <header>
          <p className="text-sm font-semibold text-primary">
            {t("settings.pageEyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            {t("settings.pageTitle")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("settings.body")}
          </p>
        </header>

        <SettingsSection
          id="general"
          icon={KeyRound}
          title={t("settings.generalTitle")}
          description={t("settings.generalDescription")}
        >
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>{t("settings.poeTitle")}</CardTitle>
              <CardDescription className="mt-1.5">
                {t("settings.poeDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <label
                htmlFor="poe-api-key"
                className="text-sm font-semibold text-foreground"
              >
                {t("settings.poeLabel")}
              </label>
              <div className="relative mt-2">
                <Input
                  id="poe-api-key"
                  type={showPoeApiKey ? "text" : "password"}
                  value={poeApiKey}
                  onChange={(event) => setPoeApiKey(event.target.value)}
                  placeholder={t("settings.poePlaceholder")}
                  autoComplete="off"
                  className="pr-12 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPoeApiKey((visible) => !visible)}
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={
                    showPoeApiKey
                      ? t("settings.hideApiKey")
                      : t("settings.showApiKey")
                  }
                >
                  {showPoeApiKey ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-3.5 text-primary" />
                {poeApiKey
                  ? t("settings.savedLocally")
                  : t("settings.notConfigured")}
              </div>
            </CardContent>
          </Card>
        </SettingsSection>

        <SettingsSection
          id="models"
          icon={Cpu}
          title={t("settings.modelsTitle")}
          description={t("settings.modelsDescription")}
        >
          <Card>
            <div className="divide-y divide-border">
              {modelFields.map(
                ({
                  key,
                  labelKey,
                  descriptionKey,
                  placeholderKey,
                  icon: Icon,
                }) => (
                  <div
                    key={key}
                    className="grid gap-4 p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {t(labelKey)}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {t(descriptionKey)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor={`model-${key}`}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        {t("settings.modelInputLabel")}
                      </label>
                      <Input
                        id={`model-${key}`}
                        value={modelSettings[key]}
                        onChange={(event) =>
                          setModelSetting(key, event.target.value)
                        }
                        placeholder={t(placeholderKey)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <Check className="size-3.5 text-primary" />
              {t("settings.modelSavedLocally")}
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection
          id="appearance"
          icon={Palette}
          title={t("settings.appearanceTitle")}
          description={t("settings.appearanceDescription")}
        >
          <Card>
            <div className="divide-y divide-border">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Palette className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t("settings.themeTitle")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("settings.themeDescription")}
                    </p>
                  </div>
                </div>
                <ThemeSwitch
                  value={themeMode}
                  onChange={setThemeMode}
                  lightLabel={t("theme.light")}
                  darkLabel={t("theme.dark")}
                  className="w-full sm:w-52"
                />
              </div>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Languages className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t("settings.languageTitle")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("settings.languageDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-52">
                  {languageOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAppLocale(option.id)}
                      className={cn(
                        "h-8 flex-1 rounded-lg px-2 text-xs font-bold transition-colors",
                        locale === option.id
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={locale === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection
          id="about"
          icon={Info}
          title={t("settings.aboutTitle")}
          description={t("settings.aboutDescription")}
        >
          <Card>
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Bot className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {t("app.name")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("settings.versionLabel")}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {t("settings.version", { version: packageJson.version })}
              </span>
            </div>
          </Card>
        </SettingsSection>

        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setView("home")}
        >
          <ArrowLeft className="size-4" />
          {t("settings.backHome")}
        </Button>
      </div>
    </div>
  );
}
