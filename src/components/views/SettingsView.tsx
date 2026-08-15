import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Check,
  CircleHelp,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  Languages,
  Lightbulb,
  Palette,
  Pencil,
  RefreshCw,
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
import { checkAppUpdate, openAppUpdate, type AppUpdateInfo } from "@/lib/appUpdate";
import { cn } from "@/lib/utils";

type SettingsSectionId = "general" | "models" | "appearance" | "help";
const settingsSectionIds: SettingsSectionId[] = [
  "general",
  "models",
  "appearance",
  "help",
];
const settingsSectionOffset = 32;

function maskApiKey(key: string) {
  if (key.length <= 4) return "••••";
  return `••••••••${key.slice(-4)}`;
}

const modelFields: {
  key: ModelSettingKey;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Bot;
  allowCustom: boolean;
}[] = [
  {
    key: "lightweight",
    labelKey: "settings.models.lightweightLabel",
    descriptionKey: "settings.models.lightweightDescription",
    icon: Lightbulb,
    allowCustom: true,
  },
  {
    key: "text",
    labelKey: "settings.models.textLabel",
    descriptionKey: "settings.models.textDescription",
    icon: FileText,
    allowCustom: true,
  },
  {
    key: "images",
    labelKey: "settings.models.imagesLabel",
    descriptionKey: "settings.models.imagesDescription",
    icon: ImageIcon,
    allowCustom: false,
  },
  {
    key: "voice",
    labelKey: "settings.models.voiceLabel",
    descriptionKey: "settings.models.voiceDescription",
    icon: Volume2,
    allowCustom: false,
  },
];

const modelOptions: Record<ModelSettingKey, string[]> = {
  lightweight: ["gpt-4.1-mini"],
  text: ["gemini-3.7-flash"],
  images: ["seedream-5.0-lite", "seedream-4.5", "gpt-image-2"],
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
  saveCustomLabel,
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
  saveCustomLabel: string;
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

  const optionsList = (
    <>
      {options.map((option) => {
        const selected = !isAdding && value === option;
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              setIsAdding(false);
              setNewModel("");
              onChange(option);
              setOpen(false);
            }}
            className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            {option}
            {selected && <Check className="size-4 text-primary" />}
          </button>
        );
      })}
      {customModelOptions.length > 0 && (
        <div className="my-1 border-t border-border pt-1">
          {customModelOptions.map((model) => {
            const selected = !isAdding && value === model;
            return (
              <div
                key={model}
                role="option"
                aria-selected={selected}
                className="flex h-9 items-center rounded-lg text-sm text-foreground transition-colors hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewModel("");
                    onChange(model);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between self-stretch px-3 text-left"
                >
                  <span className="truncate">{model}</span>
                  {selected && (
                    <Check className="ml-2 size-4 shrink-0 text-primary" />
                  )}
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
            );
          })}
        </div>
      )}
      {allowCustomModels && (
        <button
          type="button"
          role="option"
          aria-selected={isAdding}
          onClick={() => {
            setIsAdding(true);
            setNewModel("");
            setOpen(false);
          }}
          className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
        >
          {customLabel}
          {isAdding && <Check className="size-4 text-primary" />}
        </button>
      )}
    </>
  );

  return (
    <div className="flex gap-2">
      <div ref={pickerRef} className="relative min-w-0 flex-1">
        {isAdding ? (
          <Input
            id={id}
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
              if (event.key === "ArrowDown") setOpen(true);
            }}
            placeholder={customInputPlaceholder}
            aria-label={customLabel}
            className="h-10 pr-10"
          />
        ) : (
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
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        )}
        {isAdding && (
          <button
            type="button"
            aria-label={modelLabel}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        )}
        {open && (
          <div
            id={`${id}-options`}
            role="listbox"
            aria-label={modelLabel}
            className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-30 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            {optionsList}
          </div>
        )}
      </div>
      {isAdding && (
        <Button
          type="button"
          size="sm"
          className="h-10 shrink-0"
          onClick={submitCustomModel}
          disabled={!newModel.trim()}
        >
          {saveCustomLabel}
        </Button>
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
  const [revealStoredApiKey, setRevealStoredApiKey] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [availableVersion, setAvailableVersion] = useState("");
  const pendingUpdateRef = useRef<AppUpdateInfo | null>(null);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const settingsContentRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(0);

  const locale = (i18n.language === "en" ? "en" : "zh-Hant") as AppLocale;

  useEffect(() => {
    const scrollContainer = settingsContentRef.current;
    if (!scrollContainer) return;

    const updateActiveSection = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const reachedBottom =
        scrollContainer.scrollHeight > scrollContainer.clientHeight &&
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 8;
      if (reachedBottom) {
        setActiveSection(settingsSectionIds[settingsSectionIds.length - 1]);
        return;
      }

      let current: SettingsSectionId = settingsSectionIds[0];
      settingsSectionIds.forEach((sectionId) => {
        const section = document.getElementById(`settings-${sectionId}`);
        if (
          section &&
          section.getBoundingClientRect().top - containerTop <=
            settingsSectionOffset
        ) {
          current = sectionId;
        }
      });
      setActiveSection(current);
    };

    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      updateActiveSection();
    };

    const endProgrammaticScroll = () => {
      programmaticScrollRef.current = false;
    };

    const onUserScrollIntent = () => {
      programmaticScrollRef.current = false;
    };

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    scrollContainer.addEventListener("scrollend", endProgrammaticScroll);
    scrollContainer.addEventListener("wheel", onUserScrollIntent, {
      passive: true,
    });
    scrollContainer.addEventListener("touchstart", onUserScrollIntent, {
      passive: true,
    });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(programmaticScrollTimerRef.current);
      scrollContainer.removeEventListener("scroll", onScroll);
      scrollContainer.removeEventListener("scrollend", endProgrammaticScroll);
      scrollContainer.removeEventListener("wheel", onUserScrollIntent);
      scrollContainer.removeEventListener("touchstart", onUserScrollIntent);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToSection = (section: SettingsSectionId) => {
    setActiveSection(section);
    programmaticScrollRef.current = true;
    window.clearTimeout(programmaticScrollTimerRef.current);
    document.getElementById(`settings-${section}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, reduceMotion ? 0 : 800);
  };

  const checkForUpdates = async () => {
    setUpdateBusy(true);
    setAvailableVersion("");
    pendingUpdateRef.current = null;
    setUpdateMessage(t("settings.checkingUpdates"));
    try {
      const update = await checkAppUpdate();
      if (!update) {
        setUpdateMessage(t("settings.upToDate"));
        return;
      }
      pendingUpdateRef.current = update;
      setAvailableVersion(update.version);
      setUpdateMessage(t("settings.updateAvailable", { version: update.version }));
    } catch {
      setUpdateMessage(t("settings.updateCheckFailed"));
    } finally {
      setUpdateBusy(false);
    }
  };

  const installPendingUpdate = () => {
    const update = pendingUpdateRef.current;
    if (!update) return;
    openAppUpdate(update);
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
    { id: "help", label: t("settings.navigation.help"), icon: CircleHelp },
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-6 py-8 xl:flex-row xl:gap-14 xl:px-10">
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
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold outline-none transition-colors",
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
              <div className="mt-2 flex items-center gap-2">
                <div
                  id="poe-api-key"
                  className="relative flex h-11 min-w-0 flex-1 items-center rounded-xl border border-border bg-muted/60 px-3.5 pr-12 font-mono text-sm"
                >
                  {poeApiKey ? (
                    <span className="truncate text-foreground">
                      {revealStoredApiKey ? poeApiKey : maskApiKey(poeApiKey)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("settings.notConfigured")}
                    </span>
                  )}
                  {poeApiKey && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealStoredApiKey((visible) => !visible)
                      }
                      className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={
                        revealStoredApiKey
                          ? t("settings.hideApiKey")
                          : t("settings.showApiKey")
                      }
                    >
                      {revealStoredApiKey ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="h-11 shrink-0 rounded-xl px-3"
                  onClick={() => {
                    setApiKeyDraft(poeApiKey);
                    setShowPoeApiKey(false);
                    setIsEditingApiKey(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  {t("settings.editApiKey")}
                </Button>
              </div>
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
                  allowCustom,
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
                        allowCustomModels={allowCustom}
                        customModels={modelSettings.customModels?.[key] ?? []}
                        customLabel={t("settings.customModel")}
                        customInputPlaceholder={t("settings.customModelPlaceholder")}
                        saveCustomLabel={t("settings.saveCustomModel")}
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

          <SettingsSection
            id="help"
            icon={CircleHelp}
            title={t("settings.helpTitle")}
          >
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("settings.designerLabel")}
                  </p>
                  <a
                    href="https://github.com/RicoCTY"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
                  >
                    {t("settings.designerName")}
                  </a>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <h3 className="text-sm font-bold text-foreground">
                    {t("settings.firstLaunchTitle")}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("settings.firstLaunchDescription")}
                  </p>
                  <code className="mt-3 block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-[12px] text-foreground">
                    {t("settings.firstLaunchCommand")}
                  </code>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t("settings.updatesTitle")}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t("settings.updatesDescription")}
                      </p>
                      {updateMessage && (
                        <p className="mt-2 text-xs leading-relaxed text-foreground">
                          {updateMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 shrink-0 rounded-xl px-3"
                    disabled={updateBusy}
                    onClick={() =>
                      void (availableVersion
                        ? installPendingUpdate()
                        : checkForUpdates())
                    }
                  >
                    {updateBusy ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {availableVersion
                      ? t("settings.installUpdate")
                      : updateBusy
                        ? t("settings.checkingUpdates")
                        : t("settings.checkForUpdates")}
                  </Button>
                </CardContent>
              </Card>
            </div>
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

      {isEditingApiKey && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsEditingApiKey(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-api-key-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2
              id="edit-api-key-title"
              className="text-lg font-bold text-foreground"
            >
              {t("settings.editApiKeyTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.editApiKeyDescription")}
            </p>
            <div className="relative mt-5">
              <Input
                id="poe-api-key-draft"
                type={showPoeApiKey ? "text" : "password"}
                value={apiKeyDraft}
                onChange={(event) => setApiKeyDraft(event.target.value)}
                placeholder={t("settings.poePlaceholder")}
                autoComplete="off"
                autoFocus
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
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditingApiKey(false)}
              >
                {t("settings.cancelApiKey")}
              </Button>
              <Button
                disabled={!apiKeyDraft.trim()}
                onClick={() => {
                  setPoeApiKey(apiKeyDraft.trim());
                  setRevealStoredApiKey(false);
                  setIsEditingApiKey(false);
                }}
              >
                {t("settings.saveApiKey")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
