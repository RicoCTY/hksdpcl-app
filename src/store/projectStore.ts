import { create } from "zustand";

export type AgentStep =
  | "format"
  | "idea"
  | "brief"
  | "images"
  | "gallery"
  | "caption_audio"
  | "export";

export type ContentFormat = "story" | "post";
export type AspectRatio = "9:16" | "2:3" | "1:1" | "3:2";
export type ShellView = "home" | "history" | "characters" | "settings";
export type ThemeMode = "light" | "dark";
export type ModelSettingKey = "idea" | "brief" | "images" | "captionAudio";

export interface ModelSettings {
  idea: string;
  brief: string;
  images: string;
  captionAudio: string;
}

export interface CreativeBrief {
  summary: string;
  visualDirection: string;
  imagePrompt: string;
  captionDirection: string;
}

export interface CharacterImage {
  id: string;
  name: string;
  dataUrl: string;
}

export interface Character {
  id: string;
  name: string;
  background: string;
  images: CharacterImage[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectState {
  view: ShellView;
  step: AgentStep;
  format: ContentFormat | null;
  aspectRatio: AspectRatio | null;
  poeApiKey: string;
  themeMode: ThemeMode;
  modelSettings: ModelSettings;
  ideaText: string;
  referenceImageName: string | null;
  brief: CreativeBrief;
  selectedImageId: string | null;
  selectedCaption: string;
  voiceoverGenerated: boolean;
  characters: Character[];
  activeCharacterId: string | null;
  setView: (view: ShellView) => void;
  setFormat: (format: ContentFormat) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setPoeApiKey: (poeApiKey: string) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setModelSetting: (key: ModelSettingKey, value: string) => void;
  setIdeaText: (ideaText: string) => void;
  setReferenceImageName: (referenceImageName: string | null) => void;
  setBriefField: (field: keyof CreativeBrief, value: string) => void;
  setSelectedImageId: (selectedImageId: string | null) => void;
  setSelectedCaption: (selectedCaption: string) => void;
  setVoiceoverGenerated: (voiceoverGenerated: boolean) => void;
  setActiveCharacterId: (activeCharacterId: string | null) => void;
  createCharacter: () => string;
  updateCharacter: (
    characterId: string,
    updates: Partial<Pick<Character, "name" | "background">>,
  ) => void;
  addCharacterImages: (
    characterId: string,
    images: Array<Pick<CharacterImage, "name" | "dataUrl">>,
  ) => void;
  removeCharacterImage: (characterId: string, imageId: string) => void;
  deleteCharacter: (characterId: string) => void;
  confirmFormat: () => void;
  goToStep: (step: AgentStep) => void;
  newProject: () => void;
}

const POE_API_KEY_STORAGE_KEY = "hksdpcl-poe-api-key";
const THEME_MODE_STORAGE_KEY = "hksdpcl.theme-mode";
const MODEL_SETTINGS_STORAGE_KEY = "hksdpcl.model-settings";
const CHARACTERS_STORAGE_KEY = "hksdpcl.characters";
const LEGACY_CHARACTER_BACKGROUND_STORAGE_KEY =
  "hksdpcl.character-background";

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  idea: "",
  brief: "",
  images: "",
  captionAudio: "",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Local persistence can be unavailable in restricted webviews.
  }
}

function getStoredPoeApiKey() {
  return readLocalStorage(POE_API_KEY_STORAGE_KEY) ?? "";
}

function persistPoeApiKey(value: string) {
  writeLocalStorage(POE_API_KEY_STORAGE_KEY, value || null);
}

function getStoredThemeMode(): ThemeMode {
  return readLocalStorage(THEME_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyThemeMode(themeMode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = themeMode;
  document.documentElement.style.colorScheme = themeMode;
}

function persistThemeMode(themeMode: ThemeMode) {
  writeLocalStorage(THEME_MODE_STORAGE_KEY, themeMode);
}

function getStoredModelSettings(): ModelSettings {
  const saved = readLocalStorage(MODEL_SETTINGS_STORAGE_KEY);
  if (!saved) return DEFAULT_MODEL_SETTINGS;
  try {
    const parsed = JSON.parse(saved) as Partial<ModelSettings>;
    return {
      idea: typeof parsed.idea === "string" ? parsed.idea : "",
      brief: typeof parsed.brief === "string" ? parsed.brief : "",
      images: typeof parsed.images === "string" ? parsed.images : "",
      captionAudio:
        typeof parsed.captionAudio === "string" ? parsed.captionAudio : "",
    };
  } catch {
    return DEFAULT_MODEL_SETTINGS;
  }
}

function persistModelSettings(modelSettings: ModelSettings) {
  writeLocalStorage(MODEL_SETTINGS_STORAGE_KEY, JSON.stringify(modelSettings));
}

function normalizeCharacter(value: unknown): Character | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Character>;
  const images = Array.isArray(candidate.images)
    ? candidate.images.flatMap((image) => {
        if (!image || typeof image !== "object") return [];
        const candidateImage = image as Partial<CharacterImage>;
        if (
          typeof candidateImage.name !== "string" ||
          typeof candidateImage.dataUrl !== "string"
        ) {
          return [];
        }
        return [
          {
            id:
              typeof candidateImage.id === "string"
                ? candidateImage.id
                : createId("image"),
            name: candidateImage.name,
            dataUrl: candidateImage.dataUrl,
          },
        ];
      })
    : [];

  return {
    id:
      typeof candidate.id === "string" ? candidate.id : createId("character"),
    name: typeof candidate.name === "string" ? candidate.name : "",
    background:
      typeof candidate.background === "string" ? candidate.background : "",
    images,
    createdAt:
      typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    updatedAt:
      typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
  };
}

function getStoredCharacters(): Character[] {
  const saved = readLocalStorage(CHARACTERS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => {
          const character = normalizeCharacter(item);
          return character ? [character] : [];
        });
      }
    } catch {
      return [];
    }
  }

  const legacyBackground = readLocalStorage(
    LEGACY_CHARACTER_BACKGROUND_STORAGE_KEY,
  );
  if (!legacyBackground) return [];

  const now = Date.now();
  return [
    {
      id: createId("character"),
      name: "",
      background: legacyBackground,
      images: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function persistCharacters(characters: Character[]) {
  writeLocalStorage(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
}

const INITIAL_THEME_MODE = getStoredThemeMode();
applyThemeMode(INITIAL_THEME_MODE);

const STORY_ASPECT: AspectRatio = "9:16";
const DEFAULT_POST_ASPECT: AspectRatio = "1:1";

export const useProjectStore = create<ProjectState>((set, get) => ({
  view: "home",
  step: "format",
  format: null,
  aspectRatio: null,
  poeApiKey: getStoredPoeApiKey(),
  themeMode: INITIAL_THEME_MODE,
  modelSettings: getStoredModelSettings(),
  ideaText: "",
  referenceImageName: null,
  brief: {
    summary: "",
    visualDirection: "",
    imagePrompt: "",
    captionDirection: "",
  },
  selectedImageId: null,
  selectedCaption: "",
  voiceoverGenerated: false,
  characters: getStoredCharacters(),
  activeCharacterId: null,

  setView: (view) =>
    set({
      view,
      ...(view === "characters" ? { activeCharacterId: null } : {}),
    }),

  setFormat: (format) => {
    if (format === "story") {
      const current = get().aspectRatio;
      const nextRatio =
        current === "9:16" || current === "2:3" ? current : STORY_ASPECT;
      set({ format, aspectRatio: nextRatio });
      return;
    }
    const current = get().aspectRatio;
    const nextRatio =
      current === "1:1" || current === "3:2" ? current : DEFAULT_POST_ASPECT;
    set({ format, aspectRatio: nextRatio });
  },

  setAspectRatio: (aspectRatio) => set({ aspectRatio }),

  setPoeApiKey: (poeApiKey) => {
    persistPoeApiKey(poeApiKey);
    set({ poeApiKey });
  },

  setThemeMode: (themeMode) => {
    applyThemeMode(themeMode);
    persistThemeMode(themeMode);
    set({ themeMode });
  },

  setModelSetting: (key, value) => {
    const modelSettings = { ...get().modelSettings, [key]: value };
    persistModelSettings(modelSettings);
    set({ modelSettings });
  },

  setIdeaText: (ideaText) => set({ ideaText }),

  setReferenceImageName: (referenceImageName) => set({ referenceImageName }),

  setBriefField: (field, value) =>
    set({ brief: { ...get().brief, [field]: value } }),

  setSelectedImageId: (selectedImageId) => set({ selectedImageId }),

  setSelectedCaption: (selectedCaption) => set({ selectedCaption }),

  setVoiceoverGenerated: (voiceoverGenerated) =>
    set({ voiceoverGenerated }),

  setActiveCharacterId: (activeCharacterId) => set({ activeCharacterId }),

  createCharacter: () => {
    const now = Date.now();
    const character: Character = {
      id: createId("character"),
      name: "",
      background: "",
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    const characters = [...get().characters, character];
    persistCharacters(characters);
    set({ characters, activeCharacterId: character.id, view: "characters" });
    return character.id;
  },

  updateCharacter: (characterId, updates) => {
    const characters = get().characters.map((character) =>
      character.id === characterId
        ? { ...character, ...updates, updatedAt: Date.now() }
        : character,
    );
    persistCharacters(characters);
    set({ characters });
  },

  addCharacterImages: (characterId, images) => {
    if (!images.length) return;
    const characters = get().characters.map((character) =>
      character.id === characterId
        ? {
            ...character,
            images: [
              ...character.images,
              ...images.map((image) => ({ ...image, id: createId("image") })),
            ],
            updatedAt: Date.now(),
          }
        : character,
    );
    persistCharacters(characters);
    set({ characters });
  },

  removeCharacterImage: (characterId, imageId) => {
    const characters = get().characters.map((character) =>
      character.id === characterId
        ? {
            ...character,
            images: character.images.filter((image) => image.id !== imageId),
            updatedAt: Date.now(),
          }
        : character,
    );
    persistCharacters(characters);
    set({ characters });
  },

  deleteCharacter: (characterId) => {
    const characters = get().characters.filter(
      (character) => character.id !== characterId,
    );
    const activeCharacterId =
      get().activeCharacterId === characterId
        ? null
        : get().activeCharacterId;
    persistCharacters(characters);
    set({ characters, activeCharacterId });
  },

  confirmFormat: () => {
    const { format, aspectRatio } = get();
    if (!format || !aspectRatio) return;
    set({ step: "idea", view: "home" });
  },

  goToStep: (step) => set({ step, view: "home" }),

  newProject: () =>
    set({
      view: "home",
      step: "format",
      format: null,
      aspectRatio: null,
      ideaText: "",
      referenceImageName: null,
      brief: {
        summary: "",
        visualDirection: "",
        imagePrompt: "",
        captionDirection: "",
      },
      selectedImageId: null,
      selectedCaption: "",
      voiceoverGenerated: false,
      activeCharacterId: null,
    }),
}));
