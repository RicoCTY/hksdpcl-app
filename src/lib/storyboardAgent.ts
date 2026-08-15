import {
  poeChatJson,
  poeGenerateImage,
  type PoeMessage,
  type PoePart,
} from "@/lib/poeApi";
import type {
  AiMessage,
  AgentReceipt,
  Character,
  ContentFormat,
  GeneratedImage,
  ImagePage,
  StoryDesign,
  StoryMaterial,
} from "@/store/projectStore";

export const DESIGN_FIELDS: Array<keyof StoryDesign> = [
  "summary",
  "style",
  "colorPalette",
  "mood",
  "cameraLanguage",
  "audience",
  "pacing",
];

/** Typed tool registry — mirrors AgentAction types for docs and future function-calling. */
export const AGENT_TOOL_REGISTRY = [
  {
    name: "set_design",
    description: "Update global story design (project-level creative direction).",
  },
  {
    name: "upsert_pages",
    description: "Create or merge storyboard pages on the canvas.",
  },
  {
    name: "update_page",
    description: "Surgically update fields on one page.",
  },
  {
    name: "add_page",
    description: "Insert a new storyboard page.",
  },
  {
    name: "remove_page",
    description: "Delete a storyboard page.",
  },
  {
    name: "reorder_pages",
    description: "Reorder canvas pages.",
  },
  {
    name: "generate_images",
    description: "Queue image generation for one or more pages.",
  },
  {
    name: "set_active_page",
    description: "Focus a page on the canvas.",
  },
] as const;

export type AgentAction =
  | { type: "set_design"; design: Partial<StoryDesign> }
  | {
      type: "upsert_pages";
      mode?: "merge" | "replace";
      pages: Array<Partial<ImagePage> & { id?: string; pageIndex?: number }>;
    }
  | {
      type: "update_page";
      pageId?: string;
      pageIndex?: number;
      updates: Partial<ImagePage>;
    }
  | {
      type: "add_page";
      page?: Partial<ImagePage>;
      atIndex?: number;
    }
  | {
      type: "remove_page";
      pageId?: string;
      pageIndex?: number;
    }
  | {
      type: "reorder_pages";
      order: Array<string | number>;
    }
  | {
      type: "generate_images";
      pageIds?: string[];
      pageIndexes?: number[];
      all?: boolean;
    }
  | {
      type: "set_active_page";
      pageId?: string;
      pageIndex?: number;
    };

export interface AgentTurnResponse {
  reply?: string;
  actions?: AgentAction[];
  /** Legacy fields — converted to actions for older model replies. */
  design?: Partial<StoryDesign>;
  pages?: Array<Partial<ImagePage> & { id?: string; pageIndex?: number; title?: string }>;
}

export interface AgentApplyResult {
  reply: string;
  pagesToGenerate: string[];
  receipts: AgentReceipt[];
}

export interface StoryboardAgentContext {
  language: string;
  format: ContentFormat | null;
  aspectRatio: string | null;
  storyDesign: StoryDesign;
  imagePages: ImagePage[];
  activePageId: string | null;
  selectedCharacters: Character[];
  storyMaterials: StoryMaterial[];
  referenceImageDataUrl: string | null;
  aiMessages: AiMessage[];
  userRequest: string;
  attachment?: {
    name: string;
    kind: StoryMaterial["kind"];
    dataUrl?: string;
    text?: string;
  } | null;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickPageFields(page: Partial<ImagePage>) {
  return {
    ...(asString(page.title) ? { title: asString(page.title) } : {}),
    ...(asString(page.idea) ? { idea: asString(page.idea) } : {}),
    ...(asString(page.scene) ? { scene: asString(page.scene) } : {}),
    ...(asString(page.characters) ? { characters: asString(page.characters) } : {}),
    ...(asString(page.dialogue) ? { dialogue: asString(page.dialogue) } : {}),
    ...(asString(page.suggestedText)
      ? { suggestedText: asString(page.suggestedText) }
      : {}),
    ...(asString(page.composition) ? { composition: asString(page.composition) } : {}),
    ...(asString(page.imagePrompt) ? { imagePrompt: asString(page.imagePrompt) } : {}),
  } satisfies Partial<ImagePage>;
}

function emptyPage(
  partial: Partial<ImagePage> | undefined,
  fallbackTitle: string,
): ImagePage {
  const fields = pickPageFields(partial ?? {});
  return {
    id: asString(partial?.id) || createId("page"),
    title: fields.title || fallbackTitle,
    idea: fields.idea || fields.scene || "",
    scene: fields.scene || fields.idea || "",
    characters: fields.characters || "",
    dialogue: fields.dialogue || "",
    suggestedText: fields.suggestedText || "",
    composition: fields.composition || "",
    imagePrompt: fields.imagePrompt || "",
    imageIds: Array.isArray(partial?.imageIds) ? partial.imageIds : [],
    selectedImageId:
      typeof partial?.selectedImageId === "string" ? partial.selectedImageId : null,
  };
}

function resolvePageId(
  pages: ImagePage[],
  pageId?: string,
  pageIndex?: number,
): string | null {
  if (pageId) {
    const byId = pages.find((page) => page.id === pageId);
    if (byId) return byId.id;
  }
  if (typeof pageIndex === "number" && pageIndex >= 0 && pageIndex < pages.length) {
    return pages[pageIndex].id;
  }
  return null;
}

export function buildAgentSystemPrompt(
  language: string,
  format: ContentFormat | null,
) {
  const outputLanguage =
    language === "en" ? "English" : "Traditional Chinese in a formal written style";
  const pageHint =
    format === "post"
      ? language === "en"
        ? "1 to 3 pages"
        : "1 至 3 頁"
      : language === "en"
        ? "3 to 5 pages"
        : "3 至 5 頁";

  return `You are the agentic educational storyboard director inside HKSDPCL Studio (Hong Kong Survival and Disaster Prevention Council).
Your job is to turn user ideas into clear, trustworthy educational social content about survival awareness, disaster preparedness, safety habits, and public-interest learning — not entertainment-first storytelling.

Mission priorities (always):
1. Educational value first: every page should teach, remind, or reinforce one practical takeaway.
2. Accurate, calm, and reassuring tone. Avoid fear-mongering, sensational drama, gore, or panic imagery.
3. Prefer simple cause → action → benefit structure (risk/context → correct behaviour → safer outcome).
4. Keep language accessible for the general public and families in Hong Kong.
5. Visuals should support learning: clear situations, readable staging, helpful character demos, and concrete safety actions.
6. Do not invent organisational policies, statistics, laws, or official instructions. Stay general and practical unless the user provides facts.

You control the workbench through structured actions (tools):
- Global story design (collapsible sheet over the canvas) = project-level educational direction / creative system prompt.
- Storyboard canvas (center) = per-page learning beat, composition, dialogue/voiceover, and image prompts.
- The user chat (right panel) is your control channel. Obey revision requests surgically when possible.

Always reply with valid JSON only:
{
  "reply": "short explanation of what you changed / will do",
  "actions": [
    { "type": "set_design", "design": { "summary": "...", "style": "...", "colorPalette": "...", "mood": "...", "cameraLanguage": "...", "audience": "...", "pacing": "..." } },
    { "type": "upsert_pages", "mode": "merge", "pages": [
      { "id": "existing-page-id-or-omit", "pageIndex": 0, "title": "...", "scene": "...", "characters": "...", "dialogue": "...", "suggestedText": "...", "composition": "...", "imagePrompt": "English prompt", "idea": "..." }
    ]},
    { "type": "update_page", "pageId": "...", "pageIndex": 0, "updates": { "scene": "..." } },
    { "type": "add_page", "page": { "title": "...", "scene": "...", "imagePrompt": "..." }, "atIndex": 1 },
    { "type": "remove_page", "pageId": "...", "pageIndex": 2 },
    { "type": "reorder_pages", "order": ["page-id-a", 1, 0] },
    { "type": "generate_images", "pageIndexes": [0, 1], "all": false },
    { "type": "set_active_page", "pageIndex": 0 }
  ]
}

Field guidance:
- summary: the educational goal of the whole piece.
- audience: who should learn from this (e.g. families, students, office workers).
- pacing: how learning beats progress across pages.
- scene / idea: the teaching situation on that page.
- dialogue: a short spoken line that teaches or guides (not pure banter).
- suggestedText: concise on-screen educational caption or reminder.
- composition: staging that makes the lesson visually obvious.
- imagePrompt: production-ready English visual prompt supporting the lesson; no readable text/logos/watermarks in the image.

Action rules:
1. Prefer surgical actions (update_page / merge upsert) for local edits such as "change page 3 to night".
2. Use upsert_pages with mode "replace" only for full redesigns or when creating the board from scratch.
3. When revising existing pages, keep their id (or pageIndex) so images can be preserved.
4. Include generate_images only when the user asks to generate/regenerate images, or after a redesign that clearly needs new frames.
5. Keep brand, selected characters, educational tone, and global style consistent across pages.
6. Prefer ${pageHint} for new boards unless the user specifies otherwise.
7. Write design fields, titles, scene, characters, dialogue, suggestedText, composition, and idea in ${outputLanguage}.
8. Write imagePrompt in detailed English.
9. If the user's idea is vague, default to a practical educational safety/preparedness angle rather than a purely narrative story.
10. If the user only chats casually with no board change, return reply plus an empty actions array.`;
}

export function buildAgentUserContent(context: StoryboardAgentContext): PoePart[] {
  const mascotContext = context.selectedCharacters.length
    ? context.selectedCharacters
        .map(
          (character) =>
            `Character: ${character.name || "Unnamed"}\nBackground: ${character.background || "None"}`,
        )
        .join("\n\n")
    : "No characters selected.";
  const materials = context.storyMaterials
    .map((material) => `- ${material.kind}: ${material.name}`)
    .join("\n");
  const pages = context.imagePages.map((page, index) => ({
    id: page.id,
    pageIndex: index,
    title: page.title,
    scene: page.scene,
    characters: page.characters,
    dialogue: page.dialogue,
    suggestedText: page.suggestedText,
    composition: page.composition,
    imagePrompt: page.imagePrompt,
    hasImage: page.imageIds.length > 0 || Boolean(page.selectedImageId),
  }));

  const content: PoePart[] = [
    {
      type: "text",
      text: `User request:\n${context.userRequest}

Format: ${context.format ?? "not selected"} ${context.aspectRatio ?? ""}
Active page id: ${context.activePageId ?? "none"}

Current global story design (project prompt):\n${JSON.stringify(context.storyDesign, null, 2)}

Current storyboard pages (canvas):\n${JSON.stringify(pages, null, 2)}

Selected characters:\n${mascotContext}

Story materials:\n${materials || "None"}

Operate via actions. Preserve page ids when editing existing pages.`,
    },
  ];

  if (context.referenceImageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: context.referenceImageDataUrl },
    });
  }
  if (context.attachment?.dataUrl && context.attachment.kind === "image") {
    content.push({
      type: "image_url",
      image_url: { url: context.attachment.dataUrl },
    });
  }
  if (context.attachment?.text) {
    content.push({
      type: "text",
      text: `Attached file ${context.attachment.name}:\n${context.attachment.text}`,
    });
  }

  return content;
}

function isActionType(value: unknown): value is AgentAction["type"] {
  return (
    value === "set_design" ||
    value === "upsert_pages" ||
    value === "update_page" ||
    value === "add_page" ||
    value === "remove_page" ||
    value === "reorder_pages" ||
    value === "generate_images" ||
    value === "set_active_page"
  );
}

function normalizeActions(raw: AgentTurnResponse): AgentAction[] {
  const actions: AgentAction[] = [];

  if (Array.isArray(raw.actions)) {
    for (const item of raw.actions) {
      if (!item || typeof item !== "object") continue;
      const action = item as AgentAction;
      if (!isActionType(action.type)) continue;
      actions.push(action);
    }
  }

  // Legacy JSON shape support (design + pages without actions).
  if (raw.design && typeof raw.design === "object") {
    const alreadySetsDesign = actions.some((action) => action.type === "set_design");
    if (!alreadySetsDesign) {
      actions.push({ type: "set_design", design: raw.design });
    }
  }
  if (Array.isArray(raw.pages) && raw.pages.length) {
    const alreadyUpserts = actions.some((action) => action.type === "upsert_pages");
    if (!alreadyUpserts) {
      actions.push({
        type: "upsert_pages",
        mode: "replace",
        pages: raw.pages,
      });
    }
  }

  return actions;
}

export interface AgentStoreBridge {
  getStoryDesign: () => StoryDesign;
  setStoryDesign: (design: StoryDesign) => void;
  getImagePages: () => ImagePage[];
  setImagePages: (pages: ImagePage[]) => void;
  updateImagePage: (pageId: string, updates: Partial<ImagePage>) => void;
  setActivePageId: (pageId: string | null) => void;
  setSelectedImageId: (imageId: string | null) => void;
  getGeneratedImages: () => GeneratedImage[];
  setGeneratedImages: (images: GeneratedImage[]) => void;
  untitledPage: (number: number) => string;
}

export function applyAgentActions(
  response: AgentTurnResponse,
  bridge: AgentStoreBridge,
  replyFallback: string,
): AgentApplyResult {
  const actions = normalizeActions(response);
  const pagesToGenerate = new Set<string>();
  const receipts: AgentReceipt[] = [];
  let updatePageCount = 0;
  let addPageCount = 0;
  let removePageCount = 0;

  for (const action of actions) {
    switch (action.type) {
      case "set_design": {
        const nextDesign: StoryDesign = { ...bridge.getStoryDesign() };
        Object.entries(action.design ?? {}).forEach(([field, value]) => {
          if (
            DESIGN_FIELDS.includes(field as keyof StoryDesign) &&
            typeof value === "string" &&
            value.trim()
          ) {
            nextDesign[field as keyof StoryDesign] = value.trim();
          }
        });
        bridge.setStoryDesign(nextDesign);
        receipts.push({ type: "set_design" });
        break;
      }
      case "upsert_pages": {
        const mode = action.mode === "replace" ? "replace" : "merge";
        const incoming = Array.isArray(action.pages) ? action.pages : [];
        if (!incoming.length) break;

        if (mode === "replace") {
          const previous = bridge.getImagePages();
          const pages = incoming.map((page, index) => {
            const matched =
              (asString(page.id) &&
                previous.find((item) => item.id === asString(page.id))) ||
              previous[typeof page.pageIndex === "number" ? page.pageIndex : index];
            const next = emptyPage(
              {
                ...page,
                id: matched?.id,
                imageIds: matched?.imageIds,
                selectedImageId: matched?.selectedImageId ?? null,
              },
              bridge.untitledPage(index + 1),
            );
            // Drop linked images if the production prompt meaningfully changed.
            if (
              matched &&
              asString(page.imagePrompt) &&
              asString(page.imagePrompt) !== matched.imagePrompt
            ) {
              next.imageIds = [];
              next.selectedImageId = null;
            }
            return next;
          });
          const keptIds = new Set(pages.map((page) => page.id));
          const images = bridge
            .getGeneratedImages()
            .filter((image) => !image.pageId || keptIds.has(image.pageId));
          bridge.setGeneratedImages(images);
          bridge.setImagePages(pages);
          if (pages[0]) {
            bridge.setActivePageId(pages[0].id);
            bridge.setSelectedImageId(pages[0].selectedImageId);
          }
          receipts.push({ type: "upsert_pages", count: pages.length, mode });
          break;
        }

        // merge
        let pages = [...bridge.getImagePages()];
        let touched = 0;
        incoming.forEach((page, index) => {
          const targetId = resolvePageId(pages, asString(page.id) || undefined, page.pageIndex);
          const fields = pickPageFields(page);
          if (targetId) {
            const current = pages.find((item) => item.id === targetId);
            if (!current) return;
            const promptChanged =
              Boolean(fields.imagePrompt) && fields.imagePrompt !== current.imagePrompt;
            pages = pages.map((item) =>
              item.id === targetId
                ? {
                    ...item,
                    ...fields,
                    idea: fields.idea || fields.scene || item.idea,
                    scene: fields.scene || fields.idea || item.scene,
                    ...(promptChanged
                      ? { imageIds: [] as string[], selectedImageId: null }
                      : {}),
                  }
                : item,
            );
            if (promptChanged) {
              bridge.setGeneratedImages(
                bridge
                  .getGeneratedImages()
                  .filter((image) => image.pageId !== targetId),
              );
            }
            touched += 1;
          } else {
            pages.push(
              emptyPage(page, bridge.untitledPage(pages.length + index + 1)),
            );
            touched += 1;
          }
        });
        bridge.setImagePages(pages);
        if (touched) {
          receipts.push({ type: "upsert_pages", count: touched, mode });
        }
        break;
      }
      case "update_page": {
        const pages = bridge.getImagePages();
        const pageId = resolvePageId(pages, action.pageId, action.pageIndex);
        if (!pageId) break;
        const fields = pickPageFields(action.updates ?? {});
        const current = pages.find((page) => page.id === pageId);
        const promptChanged =
          Boolean(fields.imagePrompt) &&
          current &&
          fields.imagePrompt !== current.imagePrompt;
        bridge.updateImagePage(pageId, {
          ...fields,
          ...(promptChanged ? { imageIds: [], selectedImageId: null } : {}),
        });
        if (promptChanged) {
          bridge.setGeneratedImages(
            bridge.getGeneratedImages().filter((image) => image.pageId !== pageId),
          );
        }
        updatePageCount += 1;
        break;
      }
      case "add_page": {
        const pages = [...bridge.getImagePages()];
        const next = emptyPage(
          action.page,
          bridge.untitledPage(pages.length + 1),
        );
        const at =
          typeof action.atIndex === "number" &&
          action.atIndex >= 0 &&
          action.atIndex <= pages.length
            ? action.atIndex
            : pages.length;
        pages.splice(at, 0, next);
        bridge.setImagePages(pages);
        bridge.setActivePageId(next.id);
        addPageCount += 1;
        break;
      }
      case "remove_page": {
        const pages = bridge.getImagePages();
        const pageId = resolvePageId(pages, action.pageId, action.pageIndex);
        if (!pageId) break;
        const nextPages = pages.filter((page) => page.id !== pageId);
        bridge.setImagePages(nextPages);
        bridge.setGeneratedImages(
          bridge.getGeneratedImages().filter((image) => image.pageId !== pageId),
        );
        removePageCount += 1;
        break;
      }
      case "reorder_pages": {
        const pages = bridge.getImagePages();
        const next: ImagePage[] = [];
        const used = new Set<string>();
        for (const token of action.order ?? []) {
          const pageId =
            typeof token === "number"
              ? resolvePageId(pages, undefined, token)
              : resolvePageId(pages, token, undefined);
          if (!pageId || used.has(pageId)) continue;
          const page = pages.find((item) => item.id === pageId);
          if (!page) continue;
          next.push(page);
          used.add(pageId);
        }
        pages.forEach((page) => {
          if (!used.has(page.id)) next.push(page);
        });
        bridge.setImagePages(next);
        receipts.push({ type: "reorder_pages" });
        break;
      }
      case "generate_images": {
        const pages = bridge.getImagePages();
        if (action.all) {
          pages.forEach((page) => pagesToGenerate.add(page.id));
          break;
        }
        (action.pageIds ?? []).forEach((pageId) => {
          if (pages.some((page) => page.id === pageId)) pagesToGenerate.add(pageId);
        });
        (action.pageIndexes ?? []).forEach((pageIndex) => {
          const pageId = resolvePageId(pages, undefined, pageIndex);
          if (pageId) pagesToGenerate.add(pageId);
        });
        break;
      }
      case "set_active_page": {
        const pageId = resolvePageId(
          bridge.getImagePages(),
          action.pageId,
          action.pageIndex,
        );
        if (pageId) {
          bridge.setActivePageId(pageId);
          receipts.push({ type: "set_active_page" });
        }
        break;
      }
      default:
        break;
    }
  }

  if (updatePageCount) {
    receipts.push({ type: "update_page", count: updatePageCount });
  }
  if (addPageCount) {
    receipts.push({ type: "add_page", count: addPageCount });
  }
  if (removePageCount) {
    receipts.push({ type: "remove_page", count: removePageCount });
  }
  if (pagesToGenerate.size) {
    receipts.push({ type: "generate_images", count: pagesToGenerate.size });
  }

  return {
    reply: asString(response.reply) || replyFallback,
    pagesToGenerate: Array.from(pagesToGenerate),
    receipts,
  };
}

export function runStoryboardAgentTurn({
  apiKey,
  textModel,
  context,
  signal,
}: {
  apiKey: string;
  textModel: string;
  context: StoryboardAgentContext;
  signal?: AbortSignal;
}) {
  const history: PoeMessage[] = context.aiMessages.slice(-8).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  return poeChatJson<AgentTurnResponse>({
    apiKey,
    model: textModel,
    maxTokens: 3600,
    temperature: 0.7,
    signal,
    messages: [
      {
        role: "system",
        content: buildAgentSystemPrompt(context.language, context.format),
      },
      ...history,
      { role: "user", content: buildAgentUserContent(context) },
    ],
  });
}

export async function generateStoryboardPageImage({
  apiKey,
  imageModel,
  page,
  storyDesign,
  aspectRatio,
  selectedCharacters,
  referenceImageDataUrl,
}: {
  apiKey: string;
  imageModel: string;
  page: ImagePage;
  storyDesign: StoryDesign;
  aspectRatio: string | null;
  selectedCharacters: Character[];
  referenceImageDataUrl: string | null;
}) {
  const lockedAspect = aspectRatio ?? "9:16";
  const characterNotes = selectedCharacters
    .map((character) => `${character.name}: ${character.background}`)
    .join("; ");
  const designNotes = DESIGN_FIELDS.map((field) => `${field}: ${storyDesign[field]}`)
    .filter((line) => !line.endsWith(": "))
    .join("\n");

  const promptText = `Generate one educational illustration for a Hong Kong public-safety learning storyboard.
Purpose: clear teaching visual for disaster preparedness / survival awareness content. Calm, trustworthy, practical — not scary or sensational.
Aspect ratio: ${lockedAspect}
Global educational design:
${designNotes}
Page title: ${page.title}
Learning scene: ${page.scene}
Characters / demo actions: ${page.characters}
Composition for teaching clarity: ${page.composition}
Dialogue / lesson cue: ${page.dialogue}
Character continuity: ${characterNotes || "n/a"}
Image prompt:
${page.imagePrompt}
No text, logos, watermarks, or gore in the image. Prefer clean staging that makes the safety lesson easy to understand.`;

  const content: PoePart[] = [{ type: "text", text: promptText }];

  if (referenceImageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: referenceImageDataUrl },
    });
  }
  selectedCharacters.forEach((character) => {
    const cover = character.images[0];
    if (cover?.dataUrl) {
      content.push({
        type: "image_url",
        image_url: { url: cover.dataUrl },
      });
    }
  });

  const response = await poeGenerateImage({
    apiKey,
    model: imageModel,
    prompt: promptText,
    aspectRatio: lockedAspect,
    maxTokens: 800,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content:
          "You generate educational public-safety visuals for HKSDPCL. Return one clear teaching image. Keep character likeness consistent with any reference images. Respect the requested aspect ratio exactly. Avoid fear-mongering, gore, panic, or entertainment-only staging.",
      },
      { role: "user", content },
    ],
  });

  return response.images;
}
