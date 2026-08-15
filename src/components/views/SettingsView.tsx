import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  CircleCheck,
  Check,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  LoaderCircle,
  Languages,
  Lightbulb,
  Palette,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { setAppLocale, type AppLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import {
  useProjectStore,
  type ModelSettingKey,
} from "@/store/projectStore";
import { cn } from "@/lib/utils";
import { poeChat, PoeApiError } from "@/lib/poeApi";

type SettingsSectionId = "general" | "models" | "appearance";
const settingsSectionIds: SettingsSectionId[] = [
  "general",
  "models",
  "appearance",
];

const modelFields: {
  key: ModelSettingKey;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Bot;
}[] = [
  {
    key: "lightweight",
    labelKey: "settings.models.lightweightLabel",
    descriptionKey: "settings.models.lightweightDescription",
    icon: Lightbulb,
  },
  {
    key: "text",
    labelKey: "settings.models.textLabel",
    descriptionKey: "settings.models.textDescription",
    icon: FileText,
  },
  {
    key: "images",
    labelKey: "settings.models.imagesLabel",
    descriptionKey: "settings.models.imagesDescription",
    icon: ImageIcon,
  },
  {
    key: "voice",
    labelKey: "settings.models.voiceLabel",
    descriptionKey: "settings.models.voiceDescription",
    icon: Volume2,
  },
];

const modelOptions: Record<ModelSettingKey, string[]> = {
  lightweight: ["gpt-4.1-mini"],
  text: ["gemini-3.6-flash"],
  images: ["seedream-4.5", "gpt-image-2"],
  voice: ["minimax-speech-2.8"],
};

function ModelPicker({
  id,
  value,
  options,
  allowCustomModels,
  customModels,
  customLabel,
  customInputPlaceholder,
  addCustomLabel,
  removeCustomLabel,
  modelLabel,
  onChange,
  onAddCustomModel,
  onRemoveCustomModel,
}: {
  id: string;
  value: string;
  options: string[];
  allowCustomModels: boolean;
  customModels: string[];
  customLabel: string;
  customInputPlaceholder: string;
  addCustomLabel: string;
  removeCustomLabel: string;
  modelLabel: string;
  onChange: (value: string) => void;
  onAddCustomModel: (value: string) => void;
  onRemoveCustomModel: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newModel, setNewModel] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const isPreset = options.includes(value);
  const customModelOptions = allowCustomModels
    ? customModels.filter((model) => !options.includes(model))
    : [];
  const selectedLabel = value || customLabel;

  const submitCustomModel = () => {
    if (!allowCustomModels) return;
    const trimmedModel = newModel.trim();
    if (!trimmedModel) return;
    if (options.includes(trimmedModel)) onChange(trimmedModel);
    else onAddCustomModel(trimmedModel);
    setNewModel("");
    setIsAdding(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const closePicker = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closePicker);
    return () => document.removeEventListener("pointerdown", closePicker);
  }, [open]);

  return (
    <div className="space-y-2">
      <div ref={pickerRef} className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-label={modelLabel}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") setOpen(true);
          }}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-muted/50 px-3 text-left text-sm text-foreground outline-none transition-colors hover:bg-card focus:border-primary/50 focus:bg-card"
        >
          <span className={cn(!isPreset && "text-muted-foreground")}>
            {selectedLabel}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div
            id={`${id}-options`}
            role="listbox"
            aria-label={modelLabel}
            className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-30 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                {option}
                {value === option && <Check className="size-4 text-primary" />}
              </button>
            ))}
            {customModelOptions.length > 0 && (
              <div className="my-1 border-t border-border pt-1">
                {customModelOptions.map((model) => (
                  <div
                    key={model}
                    role="option"
                    aria-selected={value === model}
                    className="flex h-9 items-center rounded-lg text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(model);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between self-stretch px-3 text-left"
                    >
                      <span className="truncate">{model}</span>
                      {value === model && <Check className="ml-2 size-4 shrink-0 text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveCustomModel(model)}
                      className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`${removeCustomLabel}: ${model}`}
                      title={removeCustomLabel}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {allowCustomModels && (
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setNewModel("");
                  setOpen(false);
                }}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                <Plus className="size-4" />
                {addCustomLabel}
              </button>
            )}
          </div>
        )}
      </div>
      {allowCustomModels && isAdding && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newModel}
            onChange={(event) => setNewModel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCustomModel();
              }
              if (event.key === "Escape") {
                setIsAdding(false);
                setNewModel("");
              }
            }}
            placeholder={customInputPlaceholder}
            aria-label={customLabel}
          />
          <Button type="button" size="sm" onClick={submitCustomModel} disabled={!newModel.trim()}>
            <Plus />
            {addCustomLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: SettingsSectionId;
  icon: typeof Bot;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={`settings-${id}`} className="scroll-mt-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-4.5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const setView = useProjectStore((s) => s.setView);
  const poeApiKey = useProjectStore((s) => s.poeApiKey);
  const setPoeApiKey = useProjectStore((s) => s.setPoeApiKey);
  const themeMode = useProjectStore((s) => s.themeMode);
  const setThemeMode = useProjectStore((s) => s.setThemeMode);
  const modelSettings = useProjectStore((s) => s.modelSettings);
  const setModelSetting = useProjectStore((s) => s.setModelSetting);
  const addCustomModel = useProjectStore((s) => s.addCustomModel);
  const removeCustomModel = useProjectStore((s) => s.removeCustomModel);
  const [showPoeApiKey, setShowPoeApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionError, setConnectionError] = useState("");
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const settingsRootRef = useRef<HTMLDivElement>(null);
  const settingsContentRef = useRef<HTMLDivElement>(null);

  const locale = (i18n.language === "en" ? "en" : "zh-Hant") as AppLocale;

  useEffect(() => {
    const settingsRoot = settingsRootRef.current;
    const scrollContainer = settingsContentRef.current;
    if (!settingsRoot || !scrollContainer) return;
    const outerScrollContainer = settingsRoot.closest<HTMLElement>(".aurora-wash");
    const scrollContainers = [scrollContainer, outerScrollContainer].filter(
      (container, index, containers): container is HTMLElement =>
        Boolean(container) && containers.indexOf(container) === index,
    );

    const updateActiveSection = () => {
      const anchor = settingsRoot.getBoundingClientRect().top + 40;
      const reachedBottom = scrollContainers.some(
        (container) =>
          container.scrollHeight > container.clientHeight &&
          container.scrollTop + container.clientHeight >=
            container.scrollHeight - 8,
      );
      if (reachedBottom) {
        setActiveSection(settingsSectionIds[settingsSectionIds.length - 1]);
        return;
      }
      let current: SettingsSectionId = "general";
      settingsSectionIds.forEach((sectionId) => {
        const section = settingsRoot.querySelector<HTMLElement>(
          `#settings-${sectionId}`,
        );
        if (section && section.getBoundingClientRect().top <= anchor) {
          current = sectionId;
        }
      });
      setActiveSection(current);
    };

    updateActiveSection();
    scrollContainers.forEach((container) =>
      container.addEventListener("scroll", updateActiveSection, {
        passive: true,
      }),
    );
    window.addEventListener("resize", updateActiveSection);
    return () => {
      scrollContainers.forEach((container) =>
        container.removeEventListener("scroll", updateActiveSection),
      );
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const testConnection = async () => {
    setConnectionStatus("idle");
    setConnectionError("");
    setIsTestingConnection(true);
    try {
      // Verify the lightweight probe and the text model used by the agent loop.
      await poeChat({
        apiKey: poeApiKey,
        model: modelSettings.lightweight || "gpt-4.1-mini",
        maxTokens: 16,
        temperature: 0,
        messages: [{ role: "user", content: "Reply with OK only." }],
      });
      if (
        modelSettings.text &&
        modelSettings.text !== modelSettings.lightweight
      ) {
        await poeChat({
          apiKey: poeApiKey,
          model: modelSettings.text,
          maxTokens: 16,
          temperature: 0,
          messages: [{ role: "user", content: "Reply with OK only." }],
        });
      }
      setConnectionStatus("success");
    } catch (caught) {
      setConnectionStatus("error");
      setConnectionError(caught instanceof PoeApiError || caught instanceof Error ? caught.message : t("settings.connectionFailed"));
    } finally {
      setIsTestingConnection(false);
    }
  };

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
  ];

  return (
    <div
      ref={settingsRootRef}
      className="mx-auto flex h-full w-full max-w-6xl flex-col px-6 py-8 xl:flex-row xl:gap-14 xl:px-10"
    >
      <aside className="mb-9 shrink-0 xl:mb-0 xl:w-52">
        <div className="mb-6">
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
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold outline-none transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
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

      <div
        ref={settingsContentRef}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto xl:pr-4"
      >
        <div className="max-w-4xl space-y-10">
          <SettingsSection
          id="general"
          icon={KeyRound}
          title={t("settings.generalTitle")}
          >
          <Card>
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-primary" />
                  {poeApiKey ? t("settings.savedLocally") : t("settings.notConfigured")}
                </div>
                <Button variant="outline" size="sm" className="rounded-full" disabled={!poeApiKey || isTestingConnection} onClick={() => void testConnection()}>
                  {isTestingConnection ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
                  {isTestingConnection ? t("settings.testingConnection") : t("settings.testConnection")}
                </Button>
              </div>
              {connectionStatus === "success" && <p className="mt-3 text-xs font-semibold text-primary">{t("settings.connectionSuccess")}</p>}
              {connectionStatus === "error" && <p className="mt-3 text-xs leading-relaxed text-red-600 dark:text-red-300">{connectionError || t("settings.connectionFailed")}</p>}
            </CardContent>
          </Card>
          </SettingsSection>

          <SettingsSection
          id="models"
          icon={Cpu}
          title={t("settings.modelsTitle")}
          >
          <Card>
            <div className="divide-y divide-border">
              {modelFields.map(
                ({
                  key,
                  labelKey,
                  descriptionKey,
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
                      <ModelPicker
                        id={`model-${key}`}
                        value={modelSettings[key]}
                        options={modelOptions[key]}
                        allowCustomModels
                        customModels={modelSettings.customModels?.[key] ?? []}
                        customLabel={t("settings.customModel")}
                        customInputPlaceholder={t("settings.customModelPlaceholder")}
                        addCustomLabel={t("settings.addCustomModel")}
                        removeCustomLabel={t("settings.removeCustomModel")}
                        modelLabel={t("settings.modelInputLabel")}
                        onChange={(value) => setModelSetting(key, value)}
                        onAddCustomModel={(value) => addCustomModel(key, value)}
                        onRemoveCustomModel={(value) => removeCustomModel(key, value)}
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
                <div className="relative flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-52">
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-card shadow-sm ring-1 ring-border"
                    animate={{ x: locale === "en" ? "100%" : "0%" }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 30 }
                    }
                  />
                  {languageOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAppLocale(option.id)}
                      className={cn(
                        "relative z-10 h-8 flex-1 rounded-lg px-2 text-xs font-bold transition-colors",
                        locale === option.id
                          ? "text-foreground"
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
    </div>
  );
}
