import {
  Clapperboard,
  Copy,
  GripVertical,
  LoaderCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PoeApiError } from "@/lib/poeApi";
import {
  DESIGN_FIELDS,
  applyAgentActions,
  generateStoryboardPageImage,
  runStoryboardAgentTurn,
  type AgentStoreBridge,
} from "@/lib/storyboardAgent";
import {
  useProjectStore,
  type AiMessage,
  type ImagePage,
  type StoryMaterial,
} from "@/store/projectStore";

interface ChatAttachment {
  name: string;
  type: string;
  dataUrl?: string;
  text?: string;
  kind: StoryMaterial["kind"];
}

function readAsDataUrl(file: File) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(
        typeof reader.result === "string" ? reader.result.slice(0, 8000) : null,
      );
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

function materialKind(file: File): StoryMaterial["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function StoryboardWorkbench() {
  const { t, i18n } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const referenceImageDataUrl = useProjectStore((s) => s.referenceImageDataUrl);
  const characters = useProjectStore((s) => s.characters);
  const selectedCharacterIds = useProjectStore((s) => s.selectedCharacterIds);
  const storyDesign = useProjectStore((s) => s.storyDesign);
  const imagePages = useProjectStore((s) => s.imagePages);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const aiMessages = useProjectStore((s) => s.aiMessages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setIdeaText = useProjectStore((s) => s.setIdeaText);
  const setAiMessages = useProjectStore((s) => s.setAiMessages);
  const setStoryDesign = useProjectStore((s) => s.setStoryDesign);
  const setStoryDesignField = useProjectStore((s) => s.setStoryDesignField);
  const addStoryMaterial = useProjectStore((s) => s.addStoryMaterial);
  const setReferenceImage = useProjectStore((s) => s.setReferenceImage);
  const toggleSelectedCharacter = useProjectStore((s) => s.toggleSelectedCharacter);
  const setImagePages = useProjectStore((s) => s.setImagePages);
  const updateImagePage = useProjectStore((s) => s.updateImagePage);
  const addImagePage = useProjectStore((s) => s.addImagePage);
  const removeImagePage = useProjectStore((s) => s.removeImagePage);
  const reorderImagePages = useProjectStore((s) => s.reorderImagePages);
  const setActivePageId = useProjectStore((s) => s.setActivePageId);
  const setGeneratedImages = useProjectStore((s) => s.setGeneratedImages);
  const setSelectedImageId = useProjectStore((s) => s.setSelectedImageId);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const availableCharacters = useMemo(
    () => characters.filter((character) => !character.isDraft),
    [characters],
  );

  const activePage = imagePages.find((page) => page.id === activePageId) ?? null;
  const pageImage = (page: ImagePage) => {
    const selected =
      page.selectedImageId &&
      generatedImages.find((image) => image.id === page.selectedImageId);
    if (selected) return selected;
    return generatedImages.find((image) => page.imageIds.includes(image.id));
  };
  const activePageImage = activePage ? pageImage(activePage) : null;

  const storeBridge = (): AgentStoreBridge => ({
    getStoryDesign: () => useProjectStore.getState().storyDesign,
    setStoryDesign,
    getImagePages: () => useProjectStore.getState().imagePages,
    setImagePages,
    updateImagePage,
    setActivePageId,
    setSelectedImageId,
    getGeneratedImages: () => useProjectStore.getState().generatedImages,
    setGeneratedImages,
    untitledPage: (number) => t("workflow.workbench.untitledPage", { number }),
  });

  const appendAssistantReply = (reply: string) => {
    const assistantMessage: AiMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: reply,
      createdAt: Date.now(),
    };
    setAiMessages(
      [...useProjectStore.getState().aiMessages, assistantMessage].slice(-20),
    );
  };

  const generatePageImage = async (pageId: string) => {
    const page = useProjectStore.getState().imagePages.find((item) => item.id === pageId);
    if (!page?.imagePrompt.trim()) {
      setError(t("workflow.workbench.missingPrompt"));
      return;
    }
    setError("");
    setGeneratingPageId(pageId);
    try {
      const state = useProjectStore.getState();
      const liveSelectedCharacters = state.characters.filter(
        (character) =>
          !character.isDraft && state.selectedCharacterIds.includes(character.id),
      );
      const results = await generateStoryboardPageImage({
        apiKey: state.poeApiKey,
        imageModel: state.modelSettings.images,
        page,
        storyDesign: state.storyDesign,
        aspectRatio: state.aspectRatio,
        selectedCharacters: liveSelectedCharacters,
        referenceImageDataUrl: state.referenceImageDataUrl,
      });
      if (!results.length) throw new Error(t("workflow.images.noImageResult"));

      const image = {
        id: `image-${Date.now()}`,
        url: results[0].url,
        alt: page.title || page.scene || t("workflow.workbench.pageImage"),
        prompt: page.imagePrompt,
        createdAt: Date.now(),
        status: "ready" as const,
        pageId,
      };
      const latestPage = useProjectStore
        .getState()
        .imagePages.find((item) => item.id === pageId);
      const allImages = [...useProjectStore.getState().generatedImages, image];
      setGeneratedImages(allImages);
      updateImagePage(pageId, {
        imageIds: [...(latestPage?.imageIds ?? page.imageIds), image.id],
        selectedImageId: image.id,
      });
      setSelectedImageId(image.id);
    } catch (caught) {
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.images.agentError"),
      );
    } finally {
      setGeneratingPageId(null);
    }
  };

  const runChatPlan = async (seed: string, attachmentHint?: ChatAttachment) => {
    setError("");
    setIsGenerating(true);
    try {
      const state = useProjectStore.getState();
      const liveSelectedCharacters = state.characters.filter(
        (character) =>
          !character.isDraft && state.selectedCharacterIds.includes(character.id),
      );

      const response = await runStoryboardAgentTurn({
        apiKey: state.poeApiKey,
        textModel: state.modelSettings.text,
        context: {
          language: i18n.language,
          format: state.format,
          aspectRatio: state.aspectRatio,
          storyDesign: state.storyDesign,
          imagePages: state.imagePages,
          activePageId: state.activePageId,
          selectedCharacters: liveSelectedCharacters,
          storyMaterials: state.storyMaterials,
          referenceImageDataUrl: state.referenceImageDataUrl,
          aiMessages: state.aiMessages,
          userRequest: seed,
          attachment: attachmentHint ?? null,
        },
      });

      const applied = applyAgentActions(
        response.data,
        storeBridge(),
        t("workflow.workbench.defaultReply"),
      );
      appendAssistantReply(applied.reply);
      if (!state.ideaText.trim()) setIdeaText(seed);

      for (const pageId of applied.pagesToGenerate) {
        await generatePageImage(pageId);
      }
    } catch (caught) {
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.workbench.agentError"),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const sendMessage = async () => {
    const nextMessage = message.trim();
    if ((!nextMessage && !attachment) || isGenerating) return;

    const userContent =
      `${nextMessage || t("workflow.idea.attachmentOnly")}${
        attachment ? `\n[${attachment.kind}: ${attachment.name}]` : ""
      }`.trim();

    setAiMessages([
      ...aiMessages,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
        createdAt: Date.now(),
      },
    ]);
    setMessage("");

    if (attachment) {
      addStoryMaterial({
        name: attachment.name,
        kind: attachment.kind,
        ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}),
        ...(attachment.text ? { text: attachment.text } : {}),
      });
      if (attachment.kind === "image" && attachment.dataUrl && !referenceImageDataUrl) {
        setReferenceImage({ name: attachment.name, dataUrl: attachment.dataUrl });
      }
    }

    const pendingAttachment = attachment;
    setAttachment(null);
    await runChatPlan(userContent, pendingAttachment ?? undefined);
  };

  const redesignAll = async () => {
    const redesignPrompt = t("workflow.workbench.redesignPrompt");
    setAiMessages([
      ...useProjectStore.getState().aiMessages,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: redesignPrompt,
        createdAt: Date.now(),
      },
    ]);
    await runChatPlan(redesignPrompt);
  };

  const onAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const kind = materialKind(file);
    if (kind === "image" || kind === "video" || kind === "audio") {
      const dataUrl = await readAsDataUrl(file);
      setAttachment({
        name: file.name,
        type: file.type,
        kind,
        ...(dataUrl ? { dataUrl } : {}),
      });
    } else {
      const text = await readAsText(file);
      setAttachment({
        name: file.name,
        type: file.type,
        kind: "file",
        ...(text ? { text } : {}),
      });
    }
    input.value = "";
  };

  const onDragStart = (index: number) => (event: DragEvent) => {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    reorderImagePages(dragIndex, index);
    setDragIndex(null);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[36rem] flex-col">
      <div className="grid min-h-0 flex-1 gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Center: storyboard canvas */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-muted/30">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Clapperboard className="size-4 text-primary" />
              {t("workflow.workbench.canvasTitle")}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                addImagePage({
                  title: t("workflow.workbench.untitledPage", {
                    number: imagePages.length + 1,
                  }),
                })
              }
            >
              <Plus />
              {t("workflow.workbench.addPage")}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!imagePages.length ? (
              <div className="grid min-h-72 place-items-center text-center">
                <div>
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-card text-primary shadow-[var(--shadow-soft)]">
                    <Sparkles className="size-6" />
                  </div>
                  <p className="mt-4 text-lg font-extrabold text-foreground">
                    {t("workflow.workbench.emptyTitle")}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {t("workflow.workbench.emptyDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {imagePages.map((page, index) => {
                  const image = pageImage(page);
                  const selected = activePageId === page.id;
                  return (
                    <article
                      key={page.id}
                      draggable
                      onDragStart={onDragStart(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={onDrop(index)}
                      onClick={() => setActivePageId(page.id)}
                      className={cn(
                        "group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-soft)] ring-1 transition-shadow",
                        selected
                          ? "ring-primary/40"
                          : "ring-border/70 hover:ring-orange-200",
                      )}
                    >
                      <div
                        className={cn(
                          "relative bg-muted",
                          format === "post" ? "aspect-[4/5]" : "aspect-[9/16]",
                          "max-h-56 w-full",
                        )}
                      >
                        {image ? (
                          <img
                            src={image.url}
                            alt={image.alt}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-muted-foreground">
                            <Clapperboard className="size-6 opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-bold">
                          <GripVertical className="size-3 opacity-50" />
                          {index + 1}
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {page.title ||
                              t("workflow.workbench.untitledPage", {
                                number: index + 1,
                              })}
                          </h3>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeImagePage(page.id);
                            }}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                            aria-label={t("workflow.workbench.deletePage")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {page.scene || page.idea || t("workflow.workbench.noScene")}
                        </p>
                        {page.dialogue && (
                          <p className="line-clamp-2 rounded-lg bg-muted/60 px-2 py-1.5 text-[11px] text-foreground">
                            “{page.dialogue}”
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Page detail modal */}
          {activePage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="page-detail-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) setActivePageId(null);
              }}
            >
              <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-6">
                  <p id="page-detail-title" className="text-base font-bold">
                  {t("workflow.workbench.pageDetail")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivePageId(null)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t("workflow.workbench.closePageDetail")}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                  <div
                    className={cn(
                      "grid gap-4",
                      activePageImage
                        ? "lg:grid-cols-[220px_minmax(0,1fr)]"
                        : "",
                    )}
                  >
                    {activePageImage && (
                      <div className="flex min-h-56 items-center justify-center rounded-2xl bg-muted/50 p-3">
                        <img
                          src={activePageImage.url}
                          alt={activePageImage.alt}
                          className="max-h-72 w-full rounded-xl object-contain"
                        />
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["title", t("workflow.workbench.fields.title")],
                          ["scene", t("workflow.workbench.fields.scene")],
                          ["characters", t("workflow.workbench.fields.characters")],
                          ["dialogue", t("workflow.workbench.fields.dialogue")],
                          ["suggestedText", t("workflow.workbench.fields.suggestedText")],
                          ["composition", t("workflow.workbench.fields.composition")],
                          ["imagePrompt", t("workflow.workbench.fields.imagePrompt")],
                        ] as Array<[keyof ImagePage, string]>
                      ).map(([field, label]) => (
                        <label
                          key={field}
                          className={cn(
                            "block text-xs",
                            field === "imagePrompt" ? "sm:col-span-2" : "",
                          )}
                        >
                          <span className="font-semibold text-muted-foreground">
                            {label}
                          </span>
                          <textarea
                            value={String(activePage[field] ?? "")}
                            rows={field === "imagePrompt" ? 3 : 2}
                            onChange={(event) =>
                              updateImagePage(activePage.id, {
                                [field]: event.target.value,
                              } as Partial<ImagePage>)
                            }
                            className="mt-1 w-full resize-y rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-sm outline-none focus:border-border focus:bg-background"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={generatingPageId === activePage.id}
                      onClick={() => void generatePageImage(activePage.id)}
                    >
                      {generatingPageId === activePage.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <RefreshCw />
                      )}
                      {t("workflow.workbench.generateImage")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(activePage.imagePrompt);
                        } catch {
                          // Clipboard may be unavailable in some desktop webviews.
                        }
                      }}
                    >
                      <Copy />
                      {t("workflow.workbench.copyPrompt")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right: global design */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-muted/40">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
            <p className="text-sm font-bold text-foreground">
              {t("workflow.workbench.designTitle")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={isGenerating}
              onClick={() => void redesignAll()}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {t("workflow.workbench.redesign")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
            {DESIGN_FIELDS.map((field) => (
              <label key={field} className="block">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {t(`workflow.workbench.design.${field}`)}
                </span>
                <textarea
                  value={storyDesign[field]}
                  rows={field === "summary" || field === "style" ? 3 : 2}
                  onChange={(event) =>
                    setStoryDesignField(field, event.target.value)
                  }
                  className="mt-1 w-full resize-y rounded-xl border border-transparent bg-card px-3 py-2 text-xs leading-relaxed outline-none focus:border-border"
                />
              </label>
            ))}
          </div>
        </aside>
      </div>

      {/* Bottom chat */}
      <div className="border-t border-border bg-card px-3 py-3 sm:px-4">
        {error && (
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        {aiMessages.slice(-2).map((item) => (
          <p
            key={item.id}
            className={cn(
              "mb-2 line-clamp-2 text-xs",
              item.role === "user"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            <span className="font-bold">
              {item.role === "user"
                ? t("workflow.workbench.you")
                : t("workflow.workbench.ai")}
              ：
            </span>
            {item.content}
          </p>
        ))}
        {availableCharacters.length > 0 && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
              {t("workflow.workbench.characters")}
            </span>
            {availableCharacters.map((character) => {
              const selected = selectedCharacterIds.includes(character.id);
              return (
                <button
                  key={character.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSelectedCharacter(character.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-accent text-accent-foreground ring-1 ring-primary/25"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span className="grid size-5 place-items-center overflow-hidden rounded-full bg-card">
                    {character.images[0]?.dataUrl ? (
                      <img
                        src={character.images[0].dataUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserRound className="size-3 text-muted-foreground" />
                    )}
                  </span>
                  <span>{character.name || t("characters.untitled")}</span>
                </button>
              );
            })}
          </div>
        )}
        {attachment && (
          <div className="mb-2 flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold">
            <Paperclip className="size-3.5 text-primary" />
            <span className="max-w-56 truncate">{attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)}>
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl bg-muted/50 p-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            placeholder={t("workflow.workbench.chatPlaceholder")}
            className="min-h-11 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <label
            title={t("workflow.idea.attach")}
            aria-label={t("workflow.idea.attach")}
            className="mb-0.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Paperclip className="size-4" />
            <input
              type="file"
              accept="image/*,video/*,audio/*,.txt,.md,.pdf,.doc,.docx,.csv"
              className="sr-only"
              onChange={onAttachmentChange}
            />
          </label>
          <Button
            size="icon"
            className="mb-0.5 size-9 shrink-0 rounded-full"
            disabled={isGenerating || (!message.trim() && !attachment)}
            onClick={() => void sendMessage()}
            aria-label={t("workflow.idea.send")}
          >
            {isGenerating ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Send />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
