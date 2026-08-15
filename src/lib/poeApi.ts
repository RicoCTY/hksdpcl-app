const POE_API_URL = "https://api.poe.com/v1/chat/completions";
const POE_RESPONSES_URL = "https://api.poe.com/v1/responses";
const POE_IMAGES_URL = "https://api.poe.com/v1/images";

export type PoePart = { type: string; [key: string]: unknown };
export type PoeText = string | PoePart[];

export interface PoeMessage {
  role: "system" | "user" | "assistant";
  content: PoeText;
}

export interface PoeImageResult {
  url: string;
  alt?: string;
}

export interface PoeAudioResult {
  url: string;
}

export class PoeApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PoeApiError";
    this.status = status;
    this.code = code;
  }
}

export function isNetworkFailure(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof PoeApiError && error.status === 0) return true;
  if (error instanceof TypeError) return true;
  return false;
}

interface PoeCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<Record<string, unknown>> | null;
    };
  }>;
  error?: { message?: string; code?: string | number; type?: string };
}

function getErrorMessage(status: number, message?: string) {
  if (status === 401) return "Poe API key 無效或已過期";
  if (status === 402) return "Poe 點數不足，請檢查 Poe 帳戶餘額";
  if (status === 403) return "Poe 拒絕了此次請求，可能是模型權限或內容政策限制";
  if (status === 404) return "找不到指定的 Poe 模型，請檢查模型名稱";
  if (status === 408 || status === 504) return "Poe 處理請求逾時，請稍後再試";
  if (status === 429) return "Poe API 暫時達到速率限制，請稍後再試";
  if (status >= 500) return "Poe 或模型服務暫時不可用，請稍後再試";
  return message || "Poe API 請求失敗";
}

async function parseResponse(response: Response) {
  let body: PoeCompletionResponse | null = null;
  try {
    body = (await response.json()) as PoeCompletionResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiError = body?.error;
    throw new PoeApiError(
      getErrorMessage(response.status, apiError?.message),
      response.status,
      apiError?.code ? String(apiError.code) : apiError?.type,
    );
  }
  return body;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return (content as Array<Record<string, unknown>>)
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part.text === "string") return part.text;
      if (typeof part.content === "string") return part.content;
      return "";
    })
    .join("")
    .trim();
}

function contentHasMedia(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  if (!Array.isArray(content)) return false;
  return content.some((part) => {
    if (!part || typeof part !== "object") return false;
    const record = part as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    if (type.includes("image") || type.includes("audio") || type.includes("video")) {
      return true;
    }
    if (record.image_url || record.audio_url || record.video_url) return true;
    return false;
  });
}

function stripJsonFences(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function sliceJsonPayload(text: string) {
  const start = Math.min(
    ...[text.indexOf("{"), text.indexOf("[")].filter((index) => index >= 0),
  );
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (Number.isFinite(start) && start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

/** Repair common model JSON mistakes without touching escaped quotes. */
function repairJsonPayload(text: string) {
  return text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*\[/g, "],[")
    .replace(/}\s*\[/g, "},[")
    .replace(/]\s*{/g, "],{");
}

export function extractJson<T>(text: string): T {
  const cleaned = stripJsonFences(text);
  const candidates = [cleaned, sliceJsonPayload(cleaned)].flatMap((payload) => [
    payload,
    repairJsonPayload(payload),
  ]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try the next repair before surfacing a user-facing error.
    }
  }

  throw new Error("AI 回應格式無效，請再試一次");
}

/** Models that use Poe's dedicated images endpoint instead of chat completions. */
export function usesPoeImagesEndpoint(model: string) {
  const normalized = model.trim().toLowerCase();
  return (
    normalized.includes("gpt-image") ||
    normalized.includes("dall-e") ||
    normalized.includes("dalle")
  );
}

/** Chat image bots (e.g. Seedream) that accept an `aspect` body field. */
export function supportsChatAspect(model: string) {
  return /seedream/i.test(model.trim());
}

/**
 * Map project aspect ratio to Seedream-supported values.
 * Story stays 9:16; Instagram 4:5 maps to Seedream's closest portrait 3:4.
 */
export function toImageAspect(model: string, aspectRatio: string | null | undefined) {
  const fallback = aspectRatio?.trim() || "9:16";
  if (!supportsChatAspect(model)) return fallback;
  if (fallback === "4:5") return "3:4";
  return fallback;
}

/** Minimax Speech needs these or it falls back to Mandarin instead of Cantonese. */
export const MINIMAX_CANTONESE_VOICE = {
  voice_id: "Chinese (Mandarin)_HK_Flight_Attendant",
  language_boost: "Chinese,Yue",
} as const;

export function usesMinimaxSpeech(model: string) {
  return /minimax/i.test(model.trim());
}

/** Gemini on Poe is documented against /v1/responses, not chat completions. */
export function usesPoeResponsesEndpoint(model: string) {
  return /gemini/i.test(model.trim());
}

export async function poeChat({
  apiKey,
  model,
  messages,
  signal,
  maxTokens = 1800,
  temperature = 0.7,
  allowEmptyText = false,
  aspect,
  extraBody,
}: {
  apiKey: string;
  model: string;
  messages: PoeMessage[];
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  /** Image/audio models may return media parts without text. */
  allowEmptyText?: boolean;
  /** Seedream-style chat image bots accept aspect in the request body. */
  aspect?: string;
  /** Extra OpenAI-compatible body fields (e.g. Minimax voice_id). */
  extraBody?: Record<string, unknown>;
}) {
  if (!apiKey.trim()) throw new PoeApiError("請先喺設定加入 Poe API 金鑰", 401);
  if (!model.trim()) throw new PoeApiError("請先設定此工作流程的 Poe 模型", 400);

  if (usesPoeResponsesEndpoint(model) && !aspect) {
    try {
      const response = await poeResponses({
        apiKey,
        model,
        messages,
        signal,
        maxTokens,
        temperature,
      });
      return { text: response.text, raw: response.raw, content: response.text };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      // Fall through to chat completions if Responses is unavailable.
    }
  }

  const payload: Record<string, unknown> = {
    model: model.trim(),
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
    ...extraBody,
  };
  if (aspect && supportsChatAspect(model)) {
    payload.aspect = aspect;
  }

  let response: Response;
  try {
    response = await fetch(POE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PoeApiError("無法連接 Poe，請檢查網絡連線", 0);
  }

  const body = await parseResponse(response);
  const content = body?.choices?.[0]?.message?.content;
  const text = contentToText(content);
  const hasMedia = contentHasMedia(content) || extractImageResults(body, text).length > 0;
  if (!text && !(allowEmptyText && hasMedia)) {
    throw new PoeApiError("Poe 回應了空白內容，請重新嘗試", 502);
  }
  return { text, raw: body, content };
}

export async function poeChatJson<T>(args: Parameters<typeof poeChat>[0]) {
  const response = await poeChat({ ...args, allowEmptyText: false });
  return { data: extractJson<T>(response.text), text: response.text };
}

function toResponsesContent(content: PoeText) {
  if (typeof content === "string") return content;
  const parts: Array<Record<string, string>> = [];
  content.forEach((part) => {
    if (part.type === "image_url") {
      const imageUrl = part.image_url;
      const url =
        typeof imageUrl === "string"
          ? imageUrl
          : imageUrl && typeof imageUrl === "object"
            ? String((imageUrl as { url?: string }).url ?? "")
            : "";
      if (url) parts.push({ type: "input_image", image_url: url });
      return;
    }
    const text =
      typeof part.text === "string"
        ? part.text
        : typeof part.content === "string"
          ? part.content
          : "";
    if (text) parts.push({ type: "input_text", text });
  });
  return parts;
}

function toResponsesInput(messages: PoeMessage[]) {
  const instructions: string[] = [];
  const input: Array<Record<string, unknown>> = [];
  messages.forEach((message) => {
    if (message.role === "system") {
      const text =
        typeof message.content === "string"
          ? message.content
          : contentToText(message.content);
      if (text) instructions.push(text);
      return;
    }
    input.push({
      role: message.role,
      content: toResponsesContent(message.content),
    });
  });
  return { instructions: instructions.join("\n\n"), input };
}

function extractResponseText(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }
  const chunks: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = value as Record<string, unknown>;
    if (typeof item.text === "string" && item.text.trim()) {
      const type = typeof item.type === "string" ? item.type : "";
      if (!type || type.includes("text") || type === "output_text") {
        chunks.push(item.text);
      }
    }
    Object.values(item).forEach(visit);
  };
  visit(record.output);
  return chunks.join("\n").trim();
}

/** Poe Responses API with optional live web search. */
export async function poeResponses({
  apiKey,
  model,
  messages,
  signal,
  maxTokens = 1800,
  temperature = 0.7,
  webSearch = false,
}: {
  apiKey: string;
  model: string;
  messages: PoeMessage[];
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  webSearch?: boolean;
}) {
  if (!apiKey.trim()) throw new PoeApiError("請先喺設定加入 Poe API 金鑰", 401);
  if (!model.trim()) throw new PoeApiError("請先設定此工作流程的 Poe 模型", 400);

  const { instructions, input } = toResponsesInput(messages);
  const payload: Record<string, unknown> = {
    model: model.trim(),
    input,
    max_output_tokens: maxTokens,
    temperature,
    stream: false,
  };
  if (instructions) payload.instructions = instructions;
  if (webSearch) {
    payload.tools = [{ type: "web_search_preview" }];
    payload.include = ["web_search_call.action.sources"];
  }

  let response: Response;
  try {
    response = await fetch(POE_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PoeApiError("無法連接 Poe，請檢查網絡連線", 0);
  }

  const body = await parseResponse(response);
  const text = extractResponseText(body);
  if (!text) {
    throw new PoeApiError("Poe 回應了空白內容，請重新嘗試", 502);
  }
  return { text, raw: body };
}

export async function poeResponsesJson<T>(
  args: Parameters<typeof poeResponses>[0],
) {
  const response = await poeResponses(args);
  return { data: extractJson<T>(response.text), text: response.text };
}

/** Prefer live web search via Responses API; fall back to chat completions. */
export async function poeChatJsonWithSearch<T>(
  args: Parameters<typeof poeChat>[0],
) {
  try {
    return await poeResponsesJson<T>({
      apiKey: args.apiKey,
      model: args.model,
      messages: args.messages,
      signal: args.signal,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      webSearch: true,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return poeChatJson<T>(args);
  }
}

/** Chat call tuned for image models that often return media-only content. */
export async function poeChatImage(
  args: Omit<Parameters<typeof poeChat>[0], "allowEmptyText">,
) {
  const response = await poeChat({ ...args, allowEmptyText: true });
  const images = extractImageResults(response.raw, response.text);
  return { ...response, images };
}

/** Poe `/v1/images` endpoint used by gpt-image / DALL·E style bots. */
export async function poeImagesGenerate({
  apiKey,
  model,
  prompt,
  signal,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}) {
  if (!apiKey.trim()) throw new PoeApiError("請先喺設定加入 Poe API 金鑰", 401);
  if (!model.trim()) throw new PoeApiError("請先設定此工作流程的 Poe 模型", 400);
  if (!prompt.trim()) throw new PoeApiError("圖片提示詞不能為空", 400);

  let response: Response;
  try {
    response = await fetch(POE_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: model.trim(),
        prompt: prompt.trim(),
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PoeApiError("無法連接 Poe，請檢查網絡連線", 0);
  }

  const body = await parseResponse(response);
  const text = typeof body === "object" ? JSON.stringify(body) : "";
  const images = extractImageResults(body, text);
  if (!images.length) {
    throw new PoeApiError("Poe 圖片 API 沒有回傳可用圖片", 502);
  }
  return { images, raw: body };
}

/** Route to the correct Poe image API for the configured model. */
export async function poeGenerateImage(args: {
  apiKey: string;
  model: string;
  prompt: string;
  messages?: PoeMessage[];
  aspectRatio?: string | null;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}) {
  const model = args.model.trim();
  if (usesPoeImagesEndpoint(model)) {
    const aspectHint = args.aspectRatio ? `\nAspect ratio: ${args.aspectRatio}` : "";
    return poeImagesGenerate({
      apiKey: args.apiKey,
      model,
      prompt: `${args.prompt.trim()}${aspectHint}`,
      signal: args.signal,
    });
  }

  const aspect = toImageAspect(model, args.aspectRatio);
  const messages =
    args.messages ??
    ([
      {
        role: "user",
        content: args.prompt,
      },
    ] satisfies PoeMessage[]);

  const response = await poeChatImage({
    apiKey: args.apiKey,
    model,
    messages,
    aspect,
    signal: args.signal,
    maxTokens: args.maxTokens ?? 800,
    temperature: args.temperature ?? 0.6,
  });

  const images =
    response.images.length > 0
      ? response.images
      : extractImageResults(response.raw, response.text);

  return { images, raw: response.raw };
}

export function extractImageResults(raw: unknown, text: string): PoeImageResult[] {
  const results: PoeImageResult[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, alt?: string) => {
    if (typeof url !== "string" || !/^((https?:\/\/)|data:image\/)/i.test(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    results.push({ url, alt });
  };

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const imageUrl = record.image_url;
    if (typeof imageUrl === "string") add(imageUrl);
    else if (imageUrl && typeof imageUrl === "object") {
      add((imageUrl as Record<string, unknown>).url);
    }
    // OpenAI-style images response: { data: [{ url | b64_json }] }
    if (typeof record.b64_json === "string" && record.b64_json) {
      add(`data:image/png;base64,${record.b64_json}`);
    }
    add(record.url, typeof record.alt === "string" ? record.alt : undefined);
    Object.values(record).forEach(visit);
  };
  visit(raw);

  const markdownImages = /!\[[^\]]*\]\((https?:\/\/[^)]+|data:image\/[^)]+)\)/gi;
  for (const match of text.matchAll(markdownImages)) add(match[1]);
  const directUrls = /https?:\/\/[^\s)]+/gi;
  for (const match of text.matchAll(directUrls)) add(match[0].replace(/[.,]+$/, ""));
  return results;
}

export function extractAudioResults(raw: unknown, text: string): PoeAudioResult[] {
  const results: PoeAudioResult[] = [];
  const seen = new Set<string>();
  const add = (url: unknown) => {
    if (typeof url !== "string") return;
    const cleaned = url.replace(/[.,)]+$/, "");
    if (!isAudioUrl(cleaned) || seen.has(cleaned)) return;
    seen.add(cleaned);
    results.push({ url: cleaned });
  };

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const audioUrl = record.audio_url;
    if (typeof audioUrl === "string") add(audioUrl);
    else if (audioUrl && typeof audioUrl === "object") {
      add((audioUrl as Record<string, unknown>).url);
    }
    const contentType =
      typeof record.content_type === "string"
        ? record.content_type
        : typeof record.mime_type === "string"
          ? record.mime_type
          : "";
    if (contentType.toLowerCase().startsWith("audio/")) {
      add(record.url);
      add(record.download_url);
    }
    add(record.audio);
    add(record.url);
    add(record.download_url);
    Object.values(record).forEach(visit);
  };
  visit(raw);

  const markdownAudio = /\[(?:audio|voice|speech)?[^\]]*\]\((https?:\/\/[^)]+|data:audio\/[^)]+)\)/gi;
  for (const match of text.matchAll(markdownAudio)) add(match[1]);
  const directUrls = /https?:\/\/[^\s)]+/gi;
  for (const match of text.matchAll(directUrls)) add(match[0]);
  const dataUrls = /data:audio\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi;
  for (const match of text.matchAll(dataUrls)) add(match[0]);
  return results;
}

function isAudioUrl(url: string) {
  if (/^data:audio\//i.test(url)) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)(\?|#|$)/i.test(url)) return true;
  return /\/(audio|speech|voice|tts|media)\//i.test(url) && !/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url);
}

/** Chat call tuned for speech models that often return media-only content. */
export async function poeGenerateSpeech({
  apiKey,
  model,
  text,
  signal,
}: {
  apiKey: string;
  model: string;
  text: string;
  signal?: AbortSignal;
}) {
  if (!text.trim()) throw new PoeApiError("旁白文案不能為空", 400);
  const response = await poeChat({
    apiKey,
    model,
    allowEmptyText: true,
    maxTokens: 400,
    temperature: 0.3,
    signal,
    extraBody: usesMinimaxSpeech(model) ? { ...MINIMAX_CANTONESE_VOICE } : undefined,
    messages: [
      {
        role: "system",
        content:
          "You are a text-to-speech engine. Convert the user's script into spoken audio only. Do not add extra words, titles, or commentary. Return the audio file.",
      },
      {
        role: "user",
        content: text.trim(),
      },
    ],
  });
  const audios = extractAudioResults(response.raw, response.text);
  if (!audios.length) {
    throw new PoeApiError("Poe 語音模型沒有回傳可用音訊", 502);
  }
  return { audios, text: response.text, raw: response.raw };
}

export const POE_API_BASE_URL = "https://api.poe.com/v1";
