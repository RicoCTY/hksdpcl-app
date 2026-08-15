import { create } from "zustand";

export type AgentStep = "format" | "workbench" | "caption_audio";

export type ContentFormat = "story" | "post";
export type AspectRatio = "9:16" | "4:5";
export type ShellView = "home" | "history" | "characters" | "settings";
export type ThemeMode = "light" | "dark";
export type ProjectSort = "updated" | "name";
export type ModelSettingKey = "lightweight" | "text" | "images" | "voice";
export type CustomModelMap = Record<ModelSettingKey, string[]>;

export interface ModelSettings {
  lightweight: string;
  text: string;
  images: string;
  voice: string;
  customModels: CustomModelMap;
}

export interface CreativeBrief {
  summary: string;
  visualDirection: string;
  imagePrompt: string;
  captionDirection: string;
}

export type AgentReceipt =
  | { type: "set_design" }
  | { type: "upsert_pages"; count: number; mode: "merge" | "replace" }
  | { type: "update_page"; count: number }
  | { type: "add_page"; count: number }
  | { type: "remove_page"; count: number }
  | { type: "reorder_pages" }
  | { type: "generate_images"; count: number }
  | { type: "set_active_page" }
  | { type: "generating_image"; pageNumber: number };

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Structured receipts for assistant turns (tool outcomes). */
  receipts?: AgentReceipt[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AiMessage[];
}

export interface PlanVersion {
  id: string;
  createdAt: number;
  brief: CreativeBrief;
  reply: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  alt: string;
  prompt: string;
  createdAt: number;
  status: "ready" | "error";
  error?: string;
  pageId?: string;
}

export interface StoryDesign {
  summary: string;
  style: string;
  colorPalette: string;
  mood: string;
  cameraLanguage: string;
  audience: string;
  pacing: string;
}

export interface StoryMaterial {
  id: string;
  name: string;
  kind: "image" | "video" | "audio" | "file";
  dataUrl?: string;
  text?: string;
}

export interface ImagePage {
  id: string;
  title: string;
  idea: string;
  scene: string;
  characters: string;
  dialogue: string;
  suggestedText: string;
  composition: string;
  imagePrompt: string;
  imageIds: string[];
  selectedImageId: string | null;
}

export interface NarrationSegment {
  id: string;
  imageId: string;
  text: string;
  startSeconds: number;
  durationSeconds: number;
  audioUrl?: string;
}

export interface AudioVariant {
  id: string;
  label: string;
  createdAt: number;
  audioUrl?: string;
  note?: string;
  script?: string;
}

function normalizeStep(step: unknown): AgentStep {
  if (
    step === "brief" ||
    step === "idea" ||
    step === "gallery" ||
    step === "images"
  ) {
    return "workbench";
  }
  if (step === "export") return "caption_audio";
  if (step === "format" || step === "workbench" || step === "caption_audio") {
    return step;
  }
  return "format";
}

function emptyBrief(): CreativeBrief {
  return {
    summary: "",
    visualDirection: "",
    imagePrompt: "",
    captionDirection: "",
  };
}

function emptyStoryDesign(): StoryDesign {
  return {
    summary: "",
    style: "",
    colorPalette: "",
    mood: "",
    cameraLanguage: "",
    audience: "",
    pacing: "",
  };
}

export function storyDesignToBrief(design: StoryDesign): CreativeBrief {
  return {
    summary: design.summary,
    visualDirection: [design.style, design.mood, design.colorPalette, design.cameraLanguage]
      .filter(Boolean)
      .join(" · "),
    imagePrompt: [design.style, design.colorPalette, design.mood, design.cameraLanguage]
      .filter(Boolean)
      .join(", "),
    captionDirection: [design.audience, design.pacing].filter(Boolean).join(" · "),
  };
}

export function imagesLinkedToPages(
  images: GeneratedImage[],
  pages: ImagePage[],
) {
  const pageIds = new Set(pages.map((page) => page.id));
  const linkedIds = new Set(
    pages.flatMap((page) => [
      ...page.imageIds,
      ...(page.selectedImageId ? [page.selectedImageId] : []),
    ]),
  );
  return images.filter(
    (image) =>
      linkedIds.has(image.id) ||
      (typeof image.pageId === "string" && pageIds.has(image.pageId)),
  );
}

export function selectedImagesForPages(
  images: GeneratedImage[],
  pages: ImagePage[],
) {
  return pages.flatMap((page) => {
    const selected =
      page.selectedImageId &&
      images.find((image) => image.id === page.selectedImageId);
    if (selected) return [selected];
    for (const id of page.imageIds) {
      const match = images.find((image) => image.id === id);
      if (match) return [match];
    }
    return [];
  });
}

function emptyImagePage(partial?: Partial<ImagePage>): ImagePage {
  return {
    id: partial?.id ?? createId("page"),
    title: partial?.title ?? "",
    idea: partial?.idea ?? "",
    scene: partial?.scene ?? "",
    characters: partial?.characters ?? "",
    dialogue: partial?.dialogue ?? "",
    suggestedText: partial?.suggestedText ?? "",
    composition: partial?.composition ?? "",
    imagePrompt: partial?.imagePrompt ?? "",
    imageIds: partial?.imageIds ?? [],
    selectedImageId: partial?.selectedImageId ?? null,
  };
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
  isDraft?: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  step: AgentStep;
  format: ContentFormat | null;
  aspectRatio: AspectRatio | null;
  ideaText: string;
  referenceImageName: string | null;
  referenceImageDataUrl: string | null;
  brief: CreativeBrief;
  storyDesign: StoryDesign;
  storyMaterials: StoryMaterial[];
  aiMessages: AiMessage[];
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  planVersions: PlanVersion[];
  activePlanVersionId: string | null;
  activePageId: string | null;
  selectedCharacterIds: string[];
  generatedImages: GeneratedImage[];
  imagePages: ImagePage[];
  narrationSegments: NarrationSegment[];
  audioVariants: AudioVariant[];
  selectedAudioVariantId: string | null;
  narrationConfirmed: boolean;
  selectedImageId: string | null;
  selectedCaption: string;
  voiceoverGenerated: boolean;
  /** Page ids still waiting for image generation after a disconnect or reload. */
  imageGenerationQueue: string[];
}

export interface ProjectState {
  projectId: string;
  projectName: string;
  projects: ProjectRecord[];
  projectSort: ProjectSort;
  view: ShellView;
  step: AgentStep;
  format: ContentFormat | null;
  aspectRatio: AspectRatio | null;
  poeApiKey: string;
  themeMode: ThemeMode;
  modelSettings: ModelSettings;
  ideaText: string;
  referenceImageName: string | null;
  referenceImageDataUrl: string | null;
  brief: CreativeBrief;
  storyDesign: StoryDesign;
  storyMaterials: StoryMaterial[];
  aiMessages: AiMessage[];
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  planVersions: PlanVersion[];
  activePlanVersionId: string | null;
  activePageId: string | null;
  selectedCharacterIds: string[];
  generatedImages: GeneratedImage[];
  imagePages: ImagePage[];
  narrationSegments: NarrationSegment[];
  audioVariants: AudioVariant[];
  selectedAudioVariantId: string | null;
  narrationConfirmed: boolean;
  selectedImageId: string | null;
  selectedCaption: string;
  voiceoverGenerated: boolean;
  imageGenerationQueue: string[];
  characters: Character[];
  activeCharacterId: string | null;
  /** Ephemeral workbench UI — not persisted with the project. */
  workbenchDesignOpen: boolean;
  /** Ephemeral character editor chrome — not persisted. */
  characterEditorSession: {
    canSave: boolean;
    back: () => void;
    done: () => void;
    requestLeave: (onLeave?: () => void) => void;
  } | null;
  setView: (view: ShellView) => void;
  setProjectName: (projectName: string) => void;
  setProjectSort: (projectSort: ProjectSort) => void;
  renameProject: (projectId: string, projectName: string) => void;
  deleteProject: (projectId: string) => void;
  loadProject: (projectId: string) => void;
  setFormat: (format: ContentFormat) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setPoeApiKey: (poeApiKey: string) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setModelSetting: (key: ModelSettingKey, value: string) => void;
  addCustomModel: (key: ModelSettingKey, modelName: string) => void;
  removeCustomModel: (key: ModelSettingKey, modelName: string) => void;
  setIdeaText: (ideaText: string) => void;
  setReferenceImageName: (referenceImageName: string | null) => void;
  setReferenceImage: (referenceImage: {
    name: string;
    dataUrl: string;
  } | null) => void;
  setBriefField: (field: keyof CreativeBrief, value: string) => void;
  setBrief: (brief: CreativeBrief) => void;
  setStoryDesign: (storyDesign: StoryDesign) => void;
  setStoryDesignField: (field: keyof StoryDesign, value: string) => void;
  setStoryMaterials: (storyMaterials: StoryMaterial[]) => void;
  addStoryMaterial: (material: Omit<StoryMaterial, "id">) => void;
  removeStoryMaterial: (materialId: string) => void;
  setAiMessages: (messages: AiMessage[]) => void;
  createChatSession: () => void;
  setActiveChatSession: (sessionId: string) => void;
  clearActiveChatSession: () => void;
  deleteChatSession: (sessionId: string) => void;
  addPlanVersion: (version: Omit<PlanVersion, "id" | "createdAt">) => string;
  restorePlanVersion: (versionId: string) => void;
  setActivePageId: (activePageId: string | null) => void;
  setSelectedCharacterIds: (selectedCharacterIds: string[]) => void;
  toggleSelectedCharacter: (characterId: string) => void;
  setGeneratedImages: (images: GeneratedImage[]) => void;
  setImagePages: (pages: ImagePage[]) => void;
  updateImagePage: (pageId: string, updates: Partial<ImagePage>) => void;
  addImagePage: (page?: Partial<ImagePage>) => string;
  removeImagePage: (pageId: string) => void;
  reorderImagePages: (fromIndex: number, toIndex: number) => void;
  setNarrationSegments: (segments: NarrationSegment[]) => void;
  setAudioVariants: (variants: AudioVariant[]) => void;
  setSelectedAudioVariantId: (selectedAudioVariantId: string | null) => void;
  setNarrationConfirmed: (narrationConfirmed: boolean) => void;
  setSelectedImageId: (selectedImageId: string | null) => void;
  setSelectedCaption: (selectedCaption: string) => void;
  setVoiceoverGenerated: (voiceoverGenerated: boolean) => void;
  setImageGenerationQueue: (imageGenerationQueue: string[]) => void;
  setActiveCharacterId: (activeCharacterId: string | null) => void;
  setWorkbenchDesignOpen: (open: boolean) => void;
  toggleWorkbenchDesignOpen: () => void;
  setCharacterEditorSession: (
    session: ProjectState["characterEditorSession"],
  ) => void;
  commitCharacter: (
    characterId: string,
    draft: Pick<Character, "name" | "background" | "images">,
  ) => boolean;
  createCharacter: (seed?: {
    name?: string;
    background?: string;
    images?: Array<Pick<CharacterImage, "name" | "dataUrl">>;
  }) => string;
  completeCharacter: (characterId: string) => void;
  updateCharacter: (
    characterId: string,
    updates: Partial<Pick<Character, "name" | "background">>,
  ) => void;
  addCharacterImages: (
    characterId: string,
    images: Array<Pick<CharacterImage, "name" | "dataUrl">>,
  ) => void;
  setCharacterCover: (characterId: string, imageId: string) => void;
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
const PROJECTS_STORAGE_KEY = "hksdpcl.projects";
const PROJECT_SORT_STORAGE_KEY = "hksdpcl.project-sort";
const LEGACY_CHARACTER_BACKGROUND_STORAGE_KEY =
  "hksdpcl.character-background";

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  lightweight: "gpt-4.1-mini",
  text: "gemini-3.7-flash",
  images: "seedream-5.0-lite",
  voice: "minimax-speech-2.8",
  customModels: {
    lightweight: [],
    text: [],
    images: [],
    voice: [],
  },
};

const MODEL_SETTING_KEYS: ModelSettingKey[] = [
  "lightweight",
  "text",
  "images",
  "voice",
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_CHAT_SESSIONS = 20;
const MAX_SESSION_MESSAGES = 40;

function createEmptyChatSession(messages: AiMessage[] = []): ChatSession {
  const now = Date.now();
  return {
    id: createId("chat"),
    title: deriveSessionTitle(messages),
    createdAt: now,
    updatedAt: now,
    messages,
  };
}

function deriveSessionTitle(messages: AiMessage[], fallback = "") {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.content.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return fallback;
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

function normalizeAiMessages(value: unknown): AiMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const item = message as Partial<AiMessage>;
    if (
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.content !== "string"
    ) {
      return [];
    }
    return [
      {
        id: typeof item.id === "string" ? item.id : createId("message"),
        role: item.role,
        content: item.content,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
      },
    ];
  });
}

function normalizeChatSessions(
  value: unknown,
  fallbackMessages: AiMessage[],
): ChatSession[] {
  if (Array.isArray(value)) {
    const sessions = value.flatMap((session) => {
      if (!session || typeof session !== "object") return [];
      const item = session as Partial<ChatSession>;
      const messages = normalizeAiMessages(item.messages);
      return [
        {
          id: typeof item.id === "string" ? item.id : createId("chat"),
          title:
            typeof item.title === "string" && item.title.trim()
              ? item.title
              : deriveSessionTitle(messages),
          createdAt:
            typeof item.createdAt === "number" ? item.createdAt : Date.now(),
          updatedAt:
            typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
          messages,
        },
      ];
    });
    if (sessions.length) return sessions;
  }
  return [createEmptyChatSession(fallbackMessages)];
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
    const parsed = JSON.parse(saved) as Partial<ModelSettings> & {
      idea?: string;
      brief?: string;
      captionAudio?: string;
    };
    const rawText =
      typeof parsed.text === "string" && parsed.text
        ? parsed.text
        : typeof parsed.brief === "string" &&
            parsed.brief &&
            parsed.brief !== "Claude-Sonnet-4.6"
          ? parsed.brief
          : DEFAULT_MODEL_SETTINGS.text;
    const text =
      rawText === "gemini-3.6-flash" ? DEFAULT_MODEL_SETTINGS.text : rawText;
    const voice =
      typeof parsed.voice === "string" && parsed.voice
        ? parsed.voice
        : typeof parsed.captionAudio === "string" && parsed.captionAudio
          ? parsed.captionAudio
          : DEFAULT_MODEL_SETTINGS.voice;
    const activeModels: Record<ModelSettingKey, string> = {
      lightweight:
        typeof parsed.lightweight === "string" && parsed.lightweight
          ? parsed.lightweight
          : DEFAULT_MODEL_SETTINGS.lightweight,
      text,
      images:
        typeof parsed.images === "string" && parsed.images
          ? parsed.images
          : DEFAULT_MODEL_SETTINGS.images,
      voice,
    };
    const savedCustomModels =
      parsed.customModels as Partial<Record<ModelSettingKey, unknown>> | undefined;
    const customModels = MODEL_SETTING_KEYS.reduce<CustomModelMap>(
      (models, key) => {
        const savedValues = Array.isArray(savedCustomModels?.[key])
          ? savedCustomModels[key].filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
            )
          : [];
        const values = Array.from(
          new Set(savedValues.map((value) => value.trim())),
        ).filter((value) => value !== DEFAULT_MODEL_SETTINGS[key]);
        const activeModel = activeModels[key];
        if (
          activeModel !== DEFAULT_MODEL_SETTINGS[key] &&
          !values.includes(activeModel)
        ) {
          values.push(activeModel);
        }
        models[key] = values;
        return models;
      },
      {
        lightweight: [],
        text: [],
        images: [],
        voice: [],
      },
    );

    const modelSettings = { ...activeModels, customModels };
    if (rawText === "gemini-3.6-flash") persistModelSettings(modelSettings);
    return modelSettings;
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
    isDraft: candidate.isDraft === true,
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
          return character && !character.isDraft ? [character] : [];
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
  writeLocalStorage(
    CHARACTERS_STORAGE_KEY,
    JSON.stringify(characters.filter((character) => !character.isDraft)),
  );
}

function createEmptyProject(): ProjectRecord {
  const now = Date.now();
  const session = createEmptyChatSession();
  return {
    id: createId("project"),
    name: "",
    createdAt: now,
    updatedAt: now,
    step: "format",
    format: null,
    aspectRatio: null,
    ideaText: "",
    referenceImageName: null,
    referenceImageDataUrl: null,
    brief: emptyBrief(),
    storyDesign: emptyStoryDesign(),
    storyMaterials: [],
    aiMessages: [],
    chatSessions: [session],
    activeChatSessionId: session.id,
    planVersions: [],
    activePlanVersionId: null,
    activePageId: null,
    selectedCharacterIds: [],
    generatedImages: [],
    imagePages: [],
    narrationSegments: [],
    audioVariants: [],
    selectedAudioVariantId: null,
    narrationConfirmed: false,
    selectedImageId: null,
    selectedCaption: "",
    voiceoverGenerated: false,
    imageGenerationQueue: [],
  };
}

function normalizeProject(value: unknown): ProjectRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProjectRecord>;
  if (typeof candidate.id !== "string") return null;
  const brief = candidate.brief;
  const normalizedFormat =
    candidate.format === "story" || candidate.format === "post"
      ? candidate.format
      : null;
  const fallbackMessages = normalizeAiMessages(candidate.aiMessages);
  const chatSessions = normalizeChatSessions(
    candidate.chatSessions,
    fallbackMessages,
  );
  const activeChatSessionId =
    typeof candidate.activeChatSessionId === "string" &&
    chatSessions.some((session) => session.id === candidate.activeChatSessionId)
      ? candidate.activeChatSessionId
      : chatSessions[0].id;
  const project: ProjectRecord = {
    ...createEmptyProject(),
    ...candidate,
    id: candidate.id,
    name: typeof candidate.name === "string" ? candidate.name : "",
    createdAt:
      typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    updatedAt:
      typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
    step: normalizeStep(candidate.step),
    format: normalizedFormat,
    aspectRatio:
      normalizedFormat === "story"
        ? "9:16"
        : normalizedFormat === "post"
          ? "4:5"
          : null,
    ideaText: typeof candidate.ideaText === "string" ? candidate.ideaText : "",
    referenceImageName:
      typeof candidate.referenceImageName === "string"
        ? candidate.referenceImageName
        : null,
    referenceImageDataUrl:
      typeof candidate.referenceImageDataUrl === "string"
        ? candidate.referenceImageDataUrl
        : null,
    brief: {
      summary: typeof brief?.summary === "string" ? brief.summary : "",
      visualDirection:
        typeof brief?.visualDirection === "string" ? brief.visualDirection : "",
      imagePrompt: typeof brief?.imagePrompt === "string" ? brief.imagePrompt : "",
      captionDirection:
        typeof brief?.captionDirection === "string" ? brief.captionDirection : "",
    },
    storyDesign: (() => {
      const design = candidate.storyDesign as Partial<StoryDesign> | undefined;
      if (design && typeof design === "object") {
        return {
          summary: typeof design.summary === "string" ? design.summary : "",
          style: typeof design.style === "string" ? design.style : "",
          colorPalette:
            typeof design.colorPalette === "string" ? design.colorPalette : "",
          mood: typeof design.mood === "string" ? design.mood : "",
          cameraLanguage:
            typeof design.cameraLanguage === "string" ? design.cameraLanguage : "",
          audience: typeof design.audience === "string" ? design.audience : "",
          pacing: typeof design.pacing === "string" ? design.pacing : "",
        };
      }
      return {
        summary: typeof brief?.summary === "string" ? brief.summary : "",
        style:
          typeof brief?.visualDirection === "string" ? brief.visualDirection : "",
        colorPalette: "",
        mood: "",
        cameraLanguage: "",
        audience:
          typeof brief?.captionDirection === "string"
            ? brief.captionDirection
            : "",
        pacing: "",
      };
    })(),
    storyMaterials: Array.isArray(candidate.storyMaterials)
      ? candidate.storyMaterials.flatMap((material) => {
          if (!material || typeof material !== "object") return [];
          const item = material as Partial<StoryMaterial>;
          if (typeof item.name !== "string") return [];
          const kind =
            item.kind === "image" ||
            item.kind === "video" ||
            item.kind === "audio" ||
            item.kind === "file"
              ? item.kind
              : "file";
          return [
            {
              id: typeof item.id === "string" ? item.id : createId("material"),
              name: item.name,
              kind,
              ...(typeof item.dataUrl === "string" ? { dataUrl: item.dataUrl } : {}),
              ...(typeof item.text === "string" ? { text: item.text } : {}),
            },
          ];
        })
      : [],
    aiMessages:
      chatSessions.find((session) => session.id === activeChatSessionId)
        ?.messages ?? fallbackMessages,
    chatSessions,
    activeChatSessionId,
    planVersions: Array.isArray(candidate.planVersions)
      ? candidate.planVersions.flatMap((version) => {
          if (!version || typeof version !== "object") return [];
          const item = version as Partial<PlanVersion>;
          if (!item.brief || typeof item.brief !== "object") return [];
          const versionBrief = item.brief as Partial<CreativeBrief>;
          return [{
            id: typeof item.id === "string" ? item.id : createId("plan"),
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            reply: typeof item.reply === "string" ? item.reply : "",
            brief: {
              summary: typeof versionBrief.summary === "string" ? versionBrief.summary : "",
              visualDirection:
                typeof versionBrief.visualDirection === "string"
                  ? versionBrief.visualDirection
                  : "",
              imagePrompt:
                typeof versionBrief.imagePrompt === "string"
                  ? versionBrief.imagePrompt
                  : "",
              captionDirection:
                typeof versionBrief.captionDirection === "string"
                  ? versionBrief.captionDirection
                  : "",
            },
          }];
        })
      : [],
    activePlanVersionId:
      typeof candidate.activePlanVersionId === "string"
        ? candidate.activePlanVersionId
        : null,
    activePageId: null,
    selectedCharacterIds: Array.isArray(candidate.selectedCharacterIds)
      ? candidate.selectedCharacterIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    generatedImages: Array.isArray(candidate.generatedImages)
      ? candidate.generatedImages.flatMap((image) => {
          if (!image || typeof image !== "object") return [];
          const item = image as Partial<GeneratedImage>;
          if (typeof item.id !== "string" || typeof item.url !== "string") return [];
          return [{
            id: item.id,
            url: item.url,
            alt: typeof item.alt === "string" ? item.alt : "",
            prompt: typeof item.prompt === "string" ? item.prompt : "",
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            status: item.status === "error" ? "error" : "ready",
            ...(typeof item.error === "string" ? { error: item.error } : {}),
            ...(typeof item.pageId === "string" ? { pageId: item.pageId } : {}),
          }];
        })
      : [],
    imagePages: Array.isArray(candidate.imagePages)
      ? candidate.imagePages.flatMap((page) => {
          if (!page || typeof page !== "object") return [];
          const item = page as Partial<ImagePage>;
          if (typeof item.id !== "string") return [];
          return [
            emptyImagePage({
              id: item.id,
              title: typeof item.title === "string" ? item.title : "",
              idea: typeof item.idea === "string" ? item.idea : "",
              scene:
                typeof item.scene === "string"
                  ? item.scene
                  : typeof item.idea === "string"
                    ? item.idea
                    : "",
              characters:
                typeof item.characters === "string" ? item.characters : "",
              dialogue: typeof item.dialogue === "string" ? item.dialogue : "",
              suggestedText:
                typeof item.suggestedText === "string" ? item.suggestedText : "",
              composition:
                typeof item.composition === "string" ? item.composition : "",
              imagePrompt:
                typeof item.imagePrompt === "string" ? item.imagePrompt : "",
              imageIds: Array.isArray(item.imageIds)
                ? item.imageIds.filter((id): id is string => typeof id === "string")
                : [],
              selectedImageId:
                typeof item.selectedImageId === "string"
                  ? item.selectedImageId
                  : null,
            }),
          ];
        })
      : [],
    narrationSegments: Array.isArray(candidate.narrationSegments)
      ? candidate.narrationSegments.flatMap((segment) => {
          if (!segment || typeof segment !== "object") return [];
          const item = segment as Partial<NarrationSegment>;
          if (
            typeof item.id !== "string" ||
            typeof item.imageId !== "string" ||
            typeof item.text !== "string"
          ) {
            return [];
          }
          return [{
            id: item.id,
            imageId: item.imageId,
            text: item.text,
            startSeconds: typeof item.startSeconds === "number" ? item.startSeconds : 0,
            durationSeconds:
              typeof item.durationSeconds === "number" ? item.durationSeconds : 4,
            ...(typeof item.audioUrl === "string" ? { audioUrl: item.audioUrl } : {}),
          }];
        })
      : [],
    audioVariants: Array.isArray(candidate.audioVariants)
      ? candidate.audioVariants.flatMap((variant) => {
          if (!variant || typeof variant !== "object") return [];
          const item = variant as Partial<AudioVariant>;
          if (typeof item.id !== "string" || typeof item.label !== "string") return [];
          return [{
            id: item.id,
            label: item.label,
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            ...(typeof item.audioUrl === "string" ? { audioUrl: item.audioUrl } : {}),
            ...(typeof item.note === "string" ? { note: item.note } : {}),
            ...(typeof item.script === "string" ? { script: item.script } : {}),
          }];
        })
      : [],
    selectedAudioVariantId:
      typeof candidate.selectedAudioVariantId === "string"
        ? candidate.selectedAudioVariantId
        : null,
    narrationConfirmed: candidate.narrationConfirmed === true,
    selectedImageId:
      typeof candidate.selectedImageId === "string" ? candidate.selectedImageId : null,
    selectedCaption:
      typeof candidate.selectedCaption === "string" ? candidate.selectedCaption : "",
    voiceoverGenerated: candidate.voiceoverGenerated === true,
    imageGenerationQueue: Array.isArray(candidate.imageGenerationQueue)
      ? candidate.imageGenerationQueue.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  };
  const generatedImages = imagesLinkedToPages(
    project.generatedImages,
    project.imagePages,
  );
  return {
    ...project,
    generatedImages,
    selectedImageId:
      project.selectedImageId &&
      generatedImages.some((image) => image.id === project.selectedImageId)
        ? project.selectedImageId
        : null,
    imageGenerationQueue: project.imageGenerationQueue.filter((id) =>
      project.imagePages.some((page) => page.id === id),
    ),
  };
}

function getStoredProjects() {
  const saved = readLocalStorage(PROJECTS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const projects = parsed.flatMap((item) => {
          const project = normalizeProject(item);
          return project ? [project] : [];
        });
        if (projects.length) return projects;
      }
    } catch {
      // Start with a clean local project when persisted data is invalid.
    }
  }
  return [createEmptyProject()];
}

function persistProjects(projects: ProjectRecord[]) {
  writeLocalStorage(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function getStoredProjectSort(): ProjectSort {
  return readLocalStorage(PROJECT_SORT_STORAGE_KEY) === "name" ? "name" : "updated";
}

function persistProjectSort(projectSort: ProjectSort) {
  writeLocalStorage(PROJECT_SORT_STORAGE_KEY, projectSort);
}

const INITIAL_THEME_MODE = getStoredThemeMode();
applyThemeMode(INITIAL_THEME_MODE);

const INITIAL_PROJECTS = getStoredProjects();
persistProjects(INITIAL_PROJECTS);
const INITIAL_PROJECT = INITIAL_PROJECTS[0];
const INITIAL_PROJECT_SORT = getStoredProjectSort();

const STORY_ASPECT: AspectRatio = "9:16";
const DEFAULT_POST_ASPECT: AspectRatio = "4:5";

export const useProjectStore = create<ProjectState>((set, get) => {
  const updateProject = (updates: Partial<ProjectRecord>) => {
    const current = get();
    const imagePages = updates.imagePages ?? current.imagePages;
    const generatedImages = imagesLinkedToPages(
      updates.generatedImages ?? current.generatedImages,
      imagePages,
    );
    const selectedImageId = (() => {
      const candidate =
        updates.selectedImageId !== undefined
          ? updates.selectedImageId
          : current.selectedImageId;
      return candidate &&
        generatedImages.some((image) => image.id === candidate)
        ? candidate
        : null;
    })();
    const nextUpdates = { ...updates, generatedImages, selectedImageId };
    const projects = current.projects.map((project) =>
      project.id === current.projectId
        ? { ...project, ...nextUpdates, updatedAt: Date.now() }
        : project,
    );
    const updatedProject = projects.find(
      (project) => project.id === current.projectId,
    );
    persistProjects(projects);
    set({
      ...nextUpdates,
      projectName: updatedProject?.name ?? current.projectName,
      projects,
    });
  };

  return {
  projectId: INITIAL_PROJECT.id,
  projectName: INITIAL_PROJECT.name,
  projects: INITIAL_PROJECTS,
  projectSort: INITIAL_PROJECT_SORT,
  view: "home",
  step: INITIAL_PROJECT.step,
  format: INITIAL_PROJECT.format,
  aspectRatio: INITIAL_PROJECT.aspectRatio,
  poeApiKey: getStoredPoeApiKey(),
  themeMode: INITIAL_THEME_MODE,
  modelSettings: getStoredModelSettings(),
  ideaText: INITIAL_PROJECT.ideaText,
  referenceImageName: INITIAL_PROJECT.referenceImageName,
  referenceImageDataUrl: INITIAL_PROJECT.referenceImageDataUrl,
  brief: INITIAL_PROJECT.brief,
  storyDesign: INITIAL_PROJECT.storyDesign,
  storyMaterials: INITIAL_PROJECT.storyMaterials,
  aiMessages: INITIAL_PROJECT.aiMessages,
  chatSessions: INITIAL_PROJECT.chatSessions,
  activeChatSessionId: INITIAL_PROJECT.activeChatSessionId,
  planVersions: INITIAL_PROJECT.planVersions,
  activePlanVersionId: INITIAL_PROJECT.activePlanVersionId,
  activePageId: null,
  selectedCharacterIds: INITIAL_PROJECT.selectedCharacterIds,
  generatedImages: INITIAL_PROJECT.generatedImages,
  imagePages: INITIAL_PROJECT.imagePages,
  narrationSegments: INITIAL_PROJECT.narrationSegments,
  audioVariants: INITIAL_PROJECT.audioVariants,
  selectedAudioVariantId: INITIAL_PROJECT.selectedAudioVariantId,
  narrationConfirmed: INITIAL_PROJECT.narrationConfirmed,
  selectedImageId: INITIAL_PROJECT.selectedImageId,
  selectedCaption: INITIAL_PROJECT.selectedCaption,
  voiceoverGenerated: INITIAL_PROJECT.voiceoverGenerated,
  imageGenerationQueue: INITIAL_PROJECT.imageGenerationQueue,
  characters: getStoredCharacters(),
  activeCharacterId: null,
  workbenchDesignOpen: false,
  characterEditorSession: null,

  setView: (view) => {
    const currentCharacters = get().characters;
    const characters =
      view === "characters"
        ? currentCharacters
        : currentCharacters.filter((character) => !character.isDraft);
    if (characters.length !== currentCharacters.length) {
      persistCharacters(characters);
    }
    set({
      view,
      characters,
      ...(view === "characters" ? { activeCharacterId: null } : {}),
    });
  },

  setProjectName: (projectName) => {
    const trimmedName = projectName.trimStart().slice(0, 80);
    const projects = get().projects.map((project) =>
      project.id === get().projectId
        ? { ...project, name: trimmedName, updatedAt: Date.now() }
        : project,
    );
    persistProjects(projects);
    set({ projectName: trimmedName, projects });
  },

  setProjectSort: (projectSort) => {
    persistProjectSort(projectSort);
    set({ projectSort });
  },

  renameProject: (projectId, projectName) => {
    const trimmedName = projectName.trim().slice(0, 80);
    if (!trimmedName) return;
    const projects = get().projects.map((project) =>
      project.id === projectId
        ? { ...project, name: trimmedName, updatedAt: Date.now() }
        : project,
    );
    persistProjects(projects);
    set(
      projectId === get().projectId
        ? { projectName: trimmedName, projects }
        : { projects },
    );
  },

  deleteProject: (projectId) => {
    const current = get();
    const remaining = current.projects.filter((project) => project.id !== projectId);
    if (remaining.length === 0) {
      const emptyProject = createEmptyProject();
      persistProjects([emptyProject]);
      set({
        projectId: emptyProject.id,
        projectName: emptyProject.name,
        projects: [emptyProject],
        view: "home",
        step: emptyProject.step,
        format: emptyProject.format,
        aspectRatio: emptyProject.aspectRatio,
        ideaText: emptyProject.ideaText,
        referenceImageName: emptyProject.referenceImageName,
        referenceImageDataUrl: emptyProject.referenceImageDataUrl,
        brief: emptyProject.brief,
        storyDesign: emptyProject.storyDesign,
        storyMaterials: emptyProject.storyMaterials,
        aiMessages: emptyProject.aiMessages,
        chatSessions: emptyProject.chatSessions,
        activeChatSessionId: emptyProject.activeChatSessionId,
        planVersions: emptyProject.planVersions,
        activePlanVersionId: emptyProject.activePlanVersionId,
        activePageId: emptyProject.activePageId,
        selectedCharacterIds: emptyProject.selectedCharacterIds,
        generatedImages: emptyProject.generatedImages,
        imagePages: emptyProject.imagePages,
        narrationSegments: emptyProject.narrationSegments,
        audioVariants: emptyProject.audioVariants,
        selectedAudioVariantId: emptyProject.selectedAudioVariantId,
        narrationConfirmed: emptyProject.narrationConfirmed,
        selectedImageId: emptyProject.selectedImageId,
        selectedCaption: emptyProject.selectedCaption,
        voiceoverGenerated: emptyProject.voiceoverGenerated,
        imageGenerationQueue: emptyProject.imageGenerationQueue,
      });
      return;
    }
    persistProjects(remaining);
    if (projectId !== current.projectId) {
      set({ projects: remaining });
      return;
    }
    const nextProject = remaining[0];
    set({ projects: remaining });
    get().loadProject(nextProject.id);
  },

  loadProject: (projectId) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    set({
      projectId: project.id,
      projectName: project.name,
      step: project.step,
      format: project.format,
      aspectRatio: project.aspectRatio,
      ideaText: project.ideaText,
      referenceImageName: project.referenceImageName,
      referenceImageDataUrl: project.referenceImageDataUrl,
      brief: project.brief,
      storyDesign: project.storyDesign,
      storyMaterials: project.storyMaterials,
      aiMessages: project.aiMessages,
      chatSessions: project.chatSessions,
      activeChatSessionId: project.activeChatSessionId,
      planVersions: project.planVersions,
      activePlanVersionId: project.activePlanVersionId,
      activePageId: null,
      selectedCharacterIds: project.selectedCharacterIds,
      generatedImages: project.generatedImages,
      imagePages: project.imagePages,
      narrationSegments: project.narrationSegments,
      audioVariants: project.audioVariants,
      selectedAudioVariantId: project.selectedAudioVariantId,
      narrationConfirmed: project.narrationConfirmed,
      selectedImageId: project.selectedImageId,
      selectedCaption: project.selectedCaption,
      voiceoverGenerated: project.voiceoverGenerated,
      imageGenerationQueue: project.imageGenerationQueue,
      view: "home",
      activeCharacterId: null,
      workbenchDesignOpen: false,
    });
  },

  setFormat: (format) => {
    // Size is only choosable on the format step; afterwards it locks image generation.
    if (get().step !== "format") return;
    updateProject({
      format,
      aspectRatio: format === "story" ? STORY_ASPECT : DEFAULT_POST_ASPECT,
    });
  },

  setAspectRatio: (aspectRatio) => {
    if (get().step !== "format") return;
    updateProject({ aspectRatio });
  },

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
    const modelSettings = {
      ...get().modelSettings,
      [key]: value,
    };
    persistModelSettings(modelSettings);
    set({ modelSettings });
  },

  addCustomModel: (key, modelName) => {
    const trimmedModelName = modelName.trim();
    if (!trimmedModelName || trimmedModelName === DEFAULT_MODEL_SETTINGS[key]) {
      return;
    }
    const currentSettings = get().modelSettings;
    const customModels = {
      ...currentSettings.customModels,
      [key]: Array.from(
        new Set([
          ...(currentSettings.customModels[key] ?? []),
          trimmedModelName,
        ]),
      ),
    };
    const modelSettings = {
      ...currentSettings,
      customModels,
      [key]: trimmedModelName,
    };
    persistModelSettings(modelSettings);
    set({ modelSettings });
  },

  removeCustomModel: (key, modelName) => {
    const currentSettings = get().modelSettings;
    const customModels = {
      ...currentSettings.customModels,
      [key]: (currentSettings.customModels[key] ?? []).filter(
        (value) => value !== modelName,
      ),
    };
    const modelSettings = {
      ...currentSettings,
      customModels,
      [key]: currentSettings[key] === modelName
        ? DEFAULT_MODEL_SETTINGS[key]
        : currentSettings[key],
    };
    persistModelSettings(modelSettings);
    set({ modelSettings });
  },

  setIdeaText: (ideaText) => {
    updateProject({ ideaText });
  },

  setReferenceImageName: (referenceImageName) =>
    updateProject({ referenceImageName }),

  setReferenceImage: (referenceImage) =>
    updateProject({
      referenceImageName: referenceImage?.name ?? null,
      referenceImageDataUrl: referenceImage?.dataUrl ?? null,
    }),

  setBriefField: (field, value) =>
    updateProject({ brief: { ...get().brief, [field]: value } }),

  setBrief: (brief) => updateProject({ brief }),

  setStoryDesign: (storyDesign) =>
    updateProject({
      storyDesign,
      brief: storyDesignToBrief(storyDesign),
    }),

  setStoryDesignField: (field, value) => {
    const storyDesign = { ...get().storyDesign, [field]: value };
    updateProject({
      storyDesign,
      brief: storyDesignToBrief(storyDesign),
    });
  },

  setStoryMaterials: (storyMaterials) => updateProject({ storyMaterials }),

  addStoryMaterial: (material) => {
    const storyMaterials = [
      ...get().storyMaterials,
      { ...material, id: createId("material") },
    ];
    updateProject({ storyMaterials });
  },

  removeStoryMaterial: (materialId) => {
    updateProject({
      storyMaterials: get().storyMaterials.filter(
        (material) => material.id !== materialId,
      ),
    });
  },

  setAiMessages: (aiMessages) => {
    const current = get();
    const capped = aiMessages.slice(-MAX_SESSION_MESSAGES);
    const chatSessions = current.chatSessions.map((session) =>
      session.id === current.activeChatSessionId
        ? {
            ...session,
            messages: capped,
            title: deriveSessionTitle(capped, session.title),
            updatedAt: Date.now(),
          }
        : session,
    );
    updateProject({ aiMessages: capped, chatSessions });
  },

  createChatSession: () => {
    const current = get();
    const active = current.chatSessions.find(
      (session) => session.id === current.activeChatSessionId,
    );
    if (active && active.messages.length === 0 && current.aiMessages.length === 0) {
      return;
    }
    const session = createEmptyChatSession();
    updateProject({
      chatSessions: [session, ...current.chatSessions].slice(0, MAX_CHAT_SESSIONS),
      activeChatSessionId: session.id,
      aiMessages: [],
    });
  },

  setActiveChatSession: (sessionId) => {
    const current = get();
    const session = current.chatSessions.find((item) => item.id === sessionId);
    if (!session || session.id === current.activeChatSessionId) return;
    updateProject({
      activeChatSessionId: session.id,
      aiMessages: session.messages,
    });
  },

  clearActiveChatSession: () => {
    const current = get();
    const chatSessions = current.chatSessions.map((session) =>
      session.id === current.activeChatSessionId
        ? {
            ...session,
            title: "",
            messages: [],
            updatedAt: Date.now(),
          }
        : session,
    );
    updateProject({ aiMessages: [], chatSessions });
  },

  deleteChatSession: (sessionId) => {
    const current = get();
    const remaining = current.chatSessions.filter(
      (session) => session.id !== sessionId,
    );
    if (remaining.length === 0) {
      const session = createEmptyChatSession();
      updateProject({
        chatSessions: [session],
        activeChatSessionId: session.id,
        aiMessages: [],
      });
      return;
    }
    const nextActive =
      current.activeChatSessionId === sessionId
        ? remaining[0]
        : remaining.find((session) => session.id === current.activeChatSessionId) ??
          remaining[0];
    updateProject({
      chatSessions: remaining,
      activeChatSessionId: nextActive.id,
      aiMessages: nextActive.messages,
    });
  },

  setActivePageId: (activePageId) => set({ activePageId }),

  addPlanVersion: (version) => {
    const id = createId("plan");
    const next: PlanVersion = {
      id,
      createdAt: Date.now(),
      brief: { ...version.brief },
      reply: version.reply,
    };
    const planVersions = [...get().planVersions, next];
    updateProject({
      planVersions,
      activePlanVersionId: id,
      brief: { ...version.brief },
    });
    return id;
  },

  restorePlanVersion: (versionId) => {
    const version = get().planVersions.find((item) => item.id === versionId);
    if (!version) return;
    updateProject({
      activePlanVersionId: version.id,
      brief: { ...version.brief },
    });
  },

  setSelectedCharacterIds: (selectedCharacterIds) =>
    updateProject({ selectedCharacterIds }),

  toggleSelectedCharacter: (characterId) => {
    const current = get().selectedCharacterIds;
    const selectedCharacterIds = current.includes(characterId)
      ? current.filter((id) => id !== characterId)
      : [...current, characterId];
    updateProject({ selectedCharacterIds });
  },

  setGeneratedImages: (generatedImages) => updateProject({ generatedImages }),

  setImagePages: (imagePages) => {
    const generatedImages = imagesLinkedToPages(
      get().generatedImages,
      imagePages,
    );
    const selectedImageId =
      get().selectedImageId &&
      generatedImages.some((image) => image.id === get().selectedImageId)
        ? get().selectedImageId
        : null;
    const imageGenerationQueue = get().imageGenerationQueue.filter((id) =>
      imagePages.some((page) => page.id === id),
    );
    updateProject({
      imagePages,
      generatedImages,
      selectedImageId,
      imageGenerationQueue,
    });
  },

  updateImagePage: (pageId, updates) => {
    const imagePages = get().imagePages.map((page) =>
      page.id === pageId ? { ...page, ...updates } : page,
    );
    updateProject({ imagePages });
  },

  addImagePage: (page) => {
    const next = emptyImagePage(page);
    updateProject({
      imagePages: [...get().imagePages, next],
    });
    set({ activePageId: next.id });
    return next.id;
  },

  removeImagePage: (pageId) => {
    const imagePages = get().imagePages.filter((page) => page.id !== pageId);
    const generatedImages = imagesLinkedToPages(
      get().generatedImages,
      imagePages,
    );
    const activePageId =
      get().activePageId === pageId ? null : get().activePageId;
    const selectedImageId =
      get().selectedImageId &&
      generatedImages.some((image) => image.id === get().selectedImageId)
        ? get().selectedImageId
        : null;
    const imageGenerationQueue = get().imageGenerationQueue.filter(
      (id) => id !== pageId,
    );
    updateProject({
      imagePages,
      generatedImages,
      selectedImageId,
      imageGenerationQueue,
    });
    set({ activePageId });
  },

  reorderImagePages: (fromIndex, toIndex) => {
    const imagePages = [...get().imagePages];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= imagePages.length ||
      toIndex >= imagePages.length
    ) {
      return;
    }
    const [moved] = imagePages.splice(fromIndex, 1);
    imagePages.splice(toIndex, 0, moved);
    updateProject({ imagePages });
  },

  setNarrationSegments: (narrationSegments) =>
    updateProject({ narrationSegments }),

  setAudioVariants: (audioVariants) => updateProject({ audioVariants }),

  setSelectedAudioVariantId: (selectedAudioVariantId) =>
    updateProject({ selectedAudioVariantId }),

  setNarrationConfirmed: (narrationConfirmed) =>
    updateProject({ narrationConfirmed }),

  setSelectedImageId: (selectedImageId) => updateProject({ selectedImageId }),

  setSelectedCaption: (selectedCaption) => updateProject({ selectedCaption }),

  setVoiceoverGenerated: (voiceoverGenerated) =>
    updateProject({ voiceoverGenerated }),

  setImageGenerationQueue: (imageGenerationQueue) =>
    updateProject({ imageGenerationQueue }),

  setActiveCharacterId: (activeCharacterId) => set({ activeCharacterId }),

  setWorkbenchDesignOpen: (open) => set({ workbenchDesignOpen: open }),

  toggleWorkbenchDesignOpen: () =>
    set((state) => ({ workbenchDesignOpen: !state.workbenchDesignOpen })),

  setCharacterEditorSession: (characterEditorSession) =>
    set({ characterEditorSession }),

  commitCharacter: (characterId, draft) => {
    if (!draft.name.trim() || draft.images.length === 0) return false;
    const characters = get().characters.map((item) =>
      item.id === characterId
        ? {
            ...item,
            name: draft.name.trim(),
            background: draft.background,
            images: draft.images,
            isDraft: false,
            updatedAt: Date.now(),
          }
        : item,
    );
    persistCharacters(characters);
    set({ characters, activeCharacterId: null });
    return true;
  },

  createCharacter: (seed) => {
    const now = Date.now();
    const character: Character = {
      id: createId("character"),
      name: seed?.name?.trim() ?? "",
      background: seed?.background?.trim() ?? "",
      images: (seed?.images ?? []).map((image) => ({
        ...image,
        id: createId("image"),
      })),
      createdAt: now,
      updatedAt: now,
      isDraft: true,
    };
    const characters = [...get().characters, character];
    persistCharacters(characters);
    set({ characters, activeCharacterId: character.id, view: "characters" });
    return character.id;
  },

  completeCharacter: (characterId) => {
    const character = get().characters.find(
      (item) => item.id === characterId,
    );
    if (!character || !character.name.trim() || character.images.length === 0) {
      return;
    }
    const characters = get().characters.map((item) =>
      item.id === characterId
        ? { ...item, isDraft: false, updatedAt: Date.now() }
        : item,
    );
    persistCharacters(characters);
    set({ characters });
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

  setCharacterCover: (characterId, imageId) => {
    const characters = get().characters.map((character) => {
      if (character.id !== characterId) return character;
      const index = character.images.findIndex((image) => image.id === imageId);
      if (index <= 0) return character;
      const nextImages = [...character.images];
      const [cover] = nextImages.splice(index, 1);
      nextImages.unshift(cover);
      return { ...character, images: nextImages, updatedAt: Date.now() };
    });
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
    updateProject({ step: "workbench" });
    set({ view: "home" });
  },

  goToStep: (step) => {
    const currentStep = get().step;
    // Once the user leaves format, size is locked for image generation — no going back.
    if (step === "format" && currentStep !== "format") {
      return;
    }
    updateProject({ step });
    set({
      view: "home",
      ...(step !== "workbench" ? { workbenchDesignOpen: false } : {}),
    });
  },

  newProject: () => {
    const project = createEmptyProject();
    const projects = [project, ...get().projects];
    persistProjects(projects);
    set({
      projectId: project.id,
      projectName: project.name,
      projects,
      view: "home",
      step: "format",
      format: null,
      aspectRatio: null,
      ideaText: "",
      referenceImageName: null,
      referenceImageDataUrl: null,
      brief: emptyBrief(),
      storyDesign: emptyStoryDesign(),
      storyMaterials: [],
      aiMessages: [],
      chatSessions: project.chatSessions,
      activeChatSessionId: project.activeChatSessionId,
      planVersions: [],
      activePlanVersionId: null,
      activePageId: null,
      selectedCharacterIds: [],
      generatedImages: [],
      imagePages: [],
      narrationSegments: [],
      audioVariants: [],
      selectedAudioVariantId: null,
      narrationConfirmed: false,
      selectedImageId: null,
      selectedCaption: "",
      voiceoverGenerated: false,
      imageGenerationQueue: [],
      activeCharacterId: null,
    });
  },
  };
});
