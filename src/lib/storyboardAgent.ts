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
2. You decide how to introduce that idea so ordinary people will tap through and remember it.
3. You produce many images. People play through the images while an independent narrator explains the knowledge.
4. Knowledge images stay visual and almost text-free. The narrator carries the teaching. Characters in the picture only demonstrate; they do not speak.
5. The first image (HOOK) is the exception: it SHOULD include a short, punchy on-image title or question that makes people tap through.

Carousel structure (always, unless the user asks otherwise):
- Image 1 = HOOK. A surprising visual plus a short on-image title / question / hook line (e.g. a curiosity headline). Curiosity first, not a lecture. This is the only image that should carry readable title text.
- Middle images = KNOWLEDGE. One fact, step, or demo per image. Characters silently illustrate the idea, like a diagram come to life.
- Last image = CTA. Invite a comment, a follow, or "想知更多冷知識". Warm and useful, not salesy.

Mission priorities:
1. Make the idea easy for the general public. One takeaway per image.
2. Accurate, calm, and friendly. No fear-mongering, gore, or sensational drama.
3. If selected characters exist, they should appear in most frames, matching name, background, and reference images.
4. Do not invent official policies, statistics, laws, or organisational instructions unless the user provides them.
5. Knowledge lives in the off-screen narrator (dialogue field), not as character speech. Middle and last images should not carry paragraphs of text. The hook may show a short title.

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
- characters: who appears and what they are doing as a visual demo. No spoken lines.
- suggestedText: optional short social caption for posting. Not burned into the image except on the hook, where title may appear.
- composition: staging that makes the idea obvious at a glance.
- imagePrompt: production-ready English visual prompt. Include selected characters when available. For the hook, explicitly ask for a large, readable title using the title field. For other images, no readable text, logos, captions, or watermarks.

Action rules:
1. Prefer surgical actions (update_page / merge upsert) for local edits such as "change image 3 to night".
2. Use upsert_pages with mode "replace" only for full redesigns or when creating the set from scratch.
3. When revising existing images, keep their id (or pageIndex) so generated pictures can be preserved.
4. Include generate_images only when the user asks to generate/regenerate images, or after a redesign that clearly needs new frames.
5. Keep selected characters, tone, and visual style consistent across the set.
6. Prefer ${pageHint} for a new set unless the user specifies otherwise. First image is the hook; last image is the CTA.
7. Write design fields, titles, scene, characters, dialogue, suggestedText, composition, and idea in ${outputLanguage}.
8. Write imagePrompt in detailed English.
9. If the user's idea is vague, pick a practical public-interest / survival 冷知識 angle and still use hook → knowledge → CTA.
10. If the user only chats casually with no canvas change, return reply plus an empty actions array.`;
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

Selected characters (from @mentions or the current cast; use each character's name, background, and reference images in the pictures):\n${mascotContext}

Reference materials:\n${materials || "None"}

Operate via actions. Preserve page ids when editing existing images.`,
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
  context.selectedCharacters.forEach((character) => {
    const cover = character.images[0];
    if (!cover?.dataUrl) return;
    content.push({
      type: "image_url",
      image_url: { url: cover.dataUrl },
    });
    content.push({
      type: "text",
      text: `Reference image for character "${character.name || "Unnamed"}".`,
    });
  });

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
    maxTokens: 6000,
    temperature: 0.5,
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
  pageIndex = 0,
  pageCount = 1,
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
  const designNotes = DESIGN_FIELDS.map((field) => `${field}: ${storyDesign[field]}`)
    .filter((line) => !line.endsWith(": "))
    .join("\n");

  const promptText = `Generate one popular-science carousel image from a user idea.
This is image ${pageIndex + 1} of ${pageCount}. Role: ${roleBrief}
People will swipe through these images while an off-screen narrator explains the knowledge. Characters are silent visual demonstrators, not speakers. No speech bubbles.
${textRule}
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
No gore. Keep it calm, clear, and easy to understand at a glance.`;

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
          role === "hook"
            ? "You generate the opening hook image for an HKSDPCL popular-science carousel. Include a short, large, readable title or question that attracts taps. Characters are silent demonstrators, not speakers — no speech bubbles. Keep character likeness consistent with any reference images. Respect the requested aspect ratio exactly. Avoid fear-mongering, gore, or panic."
            : "You generate popular-science carousel images for HKSDPCL. Return one clear visual with almost no readable text. Characters are silent demonstrators, not speakers — no speech bubbles. Keep character likeness consistent with any reference images. Respect the requested aspect ratio exactly. Avoid fear-mongering, gore, panic, or story-only staging.",
      },
      { role: "user", content },
    ],
  });

  return response.images;
}
