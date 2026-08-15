import {
  poeChatJson,
  poeGenerateImage,
  type PoeMessage,
  type PoePart,
} from "@/lib/poeApi";
import { formatWebResearch, searchWebResearch } from "@/lib/webResearch";
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

export type CarouselRole = "hook" | "knowledge" | "cta";

export function carouselRole(index: number, total: number): CarouselRole {
  if (total <= 1) return "hook";
  if (index <= 0) return "hook";
  if (index >= total - 1) return "cta";
  return "knowledge";
}

/** Typed tool registry — mirrors AgentAction types for docs and future function-calling. */
export const AGENT_TOOL_REGISTRY = [
  {
    name: "set_design",
    description: "Update visual direction for the whole image set.",
  },
  {
    name: "upsert_pages",
    description: "Create or merge images on the canvas.",
  },
  {
    name: "update_page",
    description: "Surgically update fields on one page.",
  },
  {
    name: "add_page",
    description: "Insert a new image card.",
  },
  {
    name: "remove_page",
    description: "Delete an image card.",
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
  webResearch?: string;
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
        ? "5 to 7 images"
        : "5 至 7 張"
      : language === "en"
        ? "6 to 8 images"
        : "6 至 8 張";

  return `You are the image-production agent inside HKSDPCL Studio (Hong Kong Survival and Disaster Prevention Council).
Your job is to turn one user idea into a swipeable popular-science image set for the general public. Typical ideas are everyday 冷知識 / survival trivia / public-interest facts — e.g. "Japanese park benches can be taken apart and used as a cooking stove stand." You are not writing a narrative story.

How the product works:
1. The user brings an idea (and optional characters with reference images).
2. You first write the full text plan: visual direction plus every image card (scene, narrator, composition, prompt). The user reviews that text before any picture is drawn.
3. Only after the user explicitly asks to generate or regenerate images do you add generate_images.
4. Knowledge images stay visual and almost text-free. The narrator carries the teaching. Characters in the picture only demonstrate; they do not speak.
5. The first image (HOOK) is the exception: it SHOULD include a short, punchy on-image title or question that makes people tap through.

Carousel structure (always, unless the user asks otherwise):
- Image 1 = HOOK. A surprising visual plus a short on-image title / question / hook line (e.g. a curiosity headline). Curiosity first, not a lecture. This is the only image that should carry readable title text.
- Middle images = KNOWLEDGE. One fact, step, or demo per image. Characters silently illustrate the idea, like a diagram come to life.
- Last image = CTA. Invite a comment, a follow, or "想知更多冷知識". Warm and useful, not salesy.

Mission priorities:
1. Make the idea easy for the general public. One takeaway per image.
2. Accurate, calm, and friendly. No fear-mongering, gore, or sensational drama.
3. If selected characters exist, they are the ONLY cast. Use each character's exact name as one identity. A name like 貓頭鷹博士 is one owl, not a human doctor plus an owl. Never invent extra humans, doctors, scientists, or animals. Match the attached reference images.
4. Do not invent official policies, statistics, laws, or organisational instructions unless the user provides them or the supplied web research confirms them.
5. Use the supplied web research for real-world facts. If it is missing or thin, keep claims conservative and say so in the reply. Still return JSON only — never write a web-search essay.
6. Knowledge lives in the off-screen narrator (dialogue field), not as character speech. Middle and last images should not carry paragraphs of text. The hook may show a short title.

You control the workbench through structured actions (tools):
- Visual direction (collapsible sheet) = look and tone for the whole set.
- Image canvas (center) = one card per image.
- Chat (right) = the control channel. Obey revision requests surgically when possible.

Always reply with valid JSON only. Escape double quotes inside strings. Put a comma between every array item. Do not omit commas, trailing comments, or markdown fences.
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
- summary: the one idea this set introduces to the public.
- audience: who should understand this (usually the general public).
- pacing: hook → knowledge beats → CTA.
- scene / idea: what the picture shows. Visual only.
- title: for the hook, a short on-image headline that attracts taps. Keep it to a few words. Leave later images without on-image titles.
- dialogue: the narrator script for this image. 1–2 spoken sentences from an off-screen explainer. Never write this as a character talking, quoting, or chatting. Characters stay silent and only pose / demonstrate.
- characters: only selected cast members and what they are doing as a visual demo. No spoken lines. Never add an unlisted person.
- suggestedText: optional short social caption for posting. Not burned into the image except on the hook, where title may appear.
- composition: staging that makes the idea obvious at a glance.
- imagePrompt: production-ready English visual prompt. Name only the selected cast, lock their likeness to the reference sheets, and forbid extra people. For the hook, explicitly ask for a large, readable title using the title field. For other images, no readable text, logos, captions, or watermarks.

Action rules:
1. Prefer surgical actions (update_page / merge upsert) for local edits such as "change image 3 to night".
2. Use upsert_pages with mode "replace" only for full redesigns or when creating the set from scratch.
3. When revising existing images, keep their id (or pageIndex) so generated pictures can be preserved.
4. Never include generate_images on the first idea, a text revision, or a redesign. The user must review the written plan first. Add generate_images only when they explicitly ask to generate or regenerate pictures.
5. Keep selected characters, tone, and visual style consistent across the set. Do not add a human lecturer, doctor, or extra mascot to "explain" the fact.
6. Prefer ${pageHint} for a new set unless the user specifies otherwise. First image is the hook; last image is the CTA.
7. Write design fields, titles, scene, characters, dialogue, suggestedText, composition, and idea in ${outputLanguage}.
8. Write imagePrompt in detailed English.
9. If the user's idea is vague, pick a practical public-interest / survival 冷知識 angle and still use hook → knowledge → CTA.
10. If the user only chats casually with no canvas change, return reply plus an empty actions array.`;
}

export function buildAgentUserContent(context: StoryboardAgentContext): PoePart[] {
  const mascotContext = context.selectedCharacters.length
    ? `${buildCastLock(context.selectedCharacters)}\n\n${context.selectedCharacters
        .map(
          (character) =>
            `Character: ${character.name || "Unnamed"}\nBackground: ${character.background || "None"}\nReference images attached: ${character.images.length}`,
        )
        .join("\n\n")}`
    : "No characters selected. Do not invent a recurring mascot unless the user asks.";
  const materials = context.storyMaterials
    .map((material) => `- ${material.kind}: ${material.name}`)
    .join("\n");
  const pages = context.imagePages.map((page, index) => ({
    id: page.id,
    pageIndex: index,
    role: carouselRole(index, context.imagePages.length),
    title: page.title,
    scene: page.scene,
    characters: page.characters,
    voiceover: page.dialogue,
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

Current visual direction:\n${JSON.stringify(context.storyDesign, null, 2)}

Current image cards (canvas). Role is derived from order: first=hook, last=cta, middle=knowledge.\n${JSON.stringify(pages, null, 2)}

Selected characters (from @mentions or the current cast). Use only this cast. Do not invent a human doctor or extra animal:\n${mascotContext}

Reference materials:\n${materials || "None"}

${context.webResearch ? `Web research (use these facts; do not invent conflicting details):\n${context.webResearch}\n\n` : ""}Operate via actions. Preserve page ids when editing existing images.
If no pictures exist yet, or the user is only sharing / revising the idea, write the text plan only. Do not include generate_images unless they explicitly asked to generate pictures.
Return valid JSON only. No markdown, no source list outside the JSON.`,
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
  appendCharacterReferences(content, context.selectedCharacters);

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
        // Canvas focus is user-driven; do not open the image popup from the agent.
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

function buildCastLock(characters: Character[]) {
  if (!characters.length) return "";
  const names = characters
    .map((character) => `"${character.name || "Unnamed"}"`)
    .join(", ");
  return `CAST LOCK: The only allowed characters are ${names}. Each name is one character. If a name contains 博士, Doctor, Prof, or similar, that is still the same listed character — do not add a separate human doctor, scientist, or lecturer. Do not invent extra humans, animals, or mascots. Copy the attached reference sheets exactly: same species, face, colors, clothes, and proportions. Do not redesign them.`;
}

function appendCharacterReferences(content: PoePart[], characters: Character[]) {
  characters.forEach((character) => {
    const name = character.name || "Unnamed";
    const images = character.images.filter((image) => image.dataUrl);
    if (!images.length) return;
    images.forEach((image, index) => {
      content.push({
        type: "text",
        text: `Reference sheet ${index + 1} for "${name}". This is the only allowed likeness. Copy it exactly.`,
      });
      content.push({
        type: "image_url",
        image_url: { url: image.dataUrl },
      });
    });
  });
}

export function userAskedToGenerateImages(text: string) {
  return /生成(全部|所有)?(的)?(圖片|圖像)|重新生成|出圖|畫圖|generate(\s+all)?\s+(the\s+)?images?|regenerate(\s+images?)?|draw(\s+the)?\s+images?/i.test(
    text.trim(),
  );
}

export async function runStoryboardAgentTurn({
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

  let webResearch = context.webResearch ?? "";
  if (!webResearch) {
    try {
      const snippets = await searchWebResearch({
        query: [context.userRequest, context.storyDesign.summary]
          .filter(Boolean)
          .join(" — "),
        language: context.language,
        signal,
      });
      webResearch = snippets.length ? formatWebResearch(snippets) : "";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      webResearch = "";
    }
  }

  return poeChatJson<AgentTurnResponse>({
    apiKey,
    model: textModel,
    maxTokens: 6000,
    temperature: 0.5,
    signal,
    messages: [
      {
        role: "system",
        content: buildAgentSystemPrompt(context.language, context.format),
      },
      ...history,
      {
        role: "user",
        content: buildAgentUserContent({ ...context, webResearch }),
      },
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
  pageIndex = 0,
  pageCount = 1,
  signal,
}: {
  apiKey: string;
  imageModel: string;
  page: ImagePage;
  storyDesign: StoryDesign;
  aspectRatio: string | null;
  selectedCharacters: Character[];
  referenceImageDataUrl: string | null;
  pageIndex?: number;
  pageCount?: number;
  signal?: AbortSignal;
}) {
  const lockedAspect = aspectRatio ?? "9:16";
  const role = carouselRole(pageIndex, pageCount);
  const roleBrief =
    role === "hook"
      ? "HOOK — surprising, curiosity-first cover. Include a short, large, readable title or question on the image to attract taps. Not a lecture."
      : role === "cta"
        ? "CTA — warm closing visual that invites a comment, follow, or learning more. No walls of text."
        : "KNOWLEDGE — one clear demo or fact, shown visually. Characters act out the idea. Almost no readable text.";
  const textRule =
    role === "hook"
      ? `Include a short punchy on-image title. Use this exact title text if provided: "${page.title || page.scene}". Large, readable, well-designed typography. Do not dump the narrator script onto the image.`
      : "No readable text, logos, captions, speech bubbles, or watermarks. Do not paint the narrator script onto the image.";
  const characterNotes = selectedCharacters
    .map((character) => `${character.name}: ${character.background}`)
    .join("; ");
  const castLock = buildCastLock(selectedCharacters);
  const designNotes = DESIGN_FIELDS.map((field) => `${field}: ${storyDesign[field]}`)
    .filter((line) => !line.endsWith(": "))
    .join("\n");

  const promptText = `Generate one popular-science carousel image from a user idea.
This is image ${pageIndex + 1} of ${pageCount}. Role: ${roleBrief}
People will swipe through these images while an off-screen narrator explains the knowledge. Characters are silent visual demonstrators, not speakers. No speech bubbles.
${textRule}
${castLock}
If the scene or image prompt mentions any extra person, doctor, scientist, or unlisted animal, ignore that extra and keep only the locked cast.
Aspect ratio: ${lockedAspect}
Visual direction:
${designNotes}
What's in the image: ${page.scene}
On-image title: ${page.title || "n/a"}
Characters / demo actions: ${page.characters}
Composition: ${page.composition}
Character continuity: ${characterNotes || "n/a"}
Image prompt:
${page.imagePrompt}
No extra humans. No gore. Keep it calm, clear, and easy to understand at a glance.`;

  const content: PoePart[] = [{ type: "text", text: promptText }];

  if (referenceImageDataUrl) {
    content.push({
      type: "text",
      text: "Optional style/reference image for the scene, not a new character.",
    });
    content.push({
      type: "image_url",
      image_url: { url: referenceImageDataUrl },
    });
  }
  appendCharacterReferences(content, selectedCharacters);

  const likenessRule = selectedCharacters.length
    ? " Use only the locked cast. Copy the attached character reference sheets exactly. Do not add a human doctor or redesign the animals."
    : " Keep character likeness consistent with any reference images.";

  const response = await poeGenerateImage({
    apiKey,
    model: imageModel,
    prompt: promptText,
    aspectRatio: lockedAspect,
    maxTokens: 800,
    temperature: 0.45,
    signal,
    messages: [
      {
        role: "system",
        content:
          role === "hook"
            ? `You generate the opening hook image for an HKSDPCL popular-science carousel. Include a short, large, readable title or question that attracts taps. Characters are silent demonstrators, not speakers — no speech bubbles.${likenessRule} Respect the requested aspect ratio exactly. Avoid fear-mongering, gore, or panic.`
            : `You generate popular-science carousel images for HKSDPCL. Return one clear visual with almost no readable text. Characters are silent demonstrators, not speakers — no speech bubbles.${likenessRule} Respect the requested aspect ratio exactly. Avoid fear-mongering, gore, panic, or story-only staging.`,
      },
      { role: "user", content },
    ],
  });

  return response.images;
}
