import {
  Clapperboard,
  Copy,
  GripVertical,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ChatPanel,
  type ChatAttachment,
} from "@/components/workbench/ChatPanel";
import { DesignSheet } from "@/components/workbench/DesignSheet";
import { cn } from "@/lib/utils";
import { PoeApiError } from "@/lib/poeApi";
import {
  applyAgentActions,
  generateStoryboardPageImage,
  runStoryboardAgentTurn,
  type AgentStoreBridge,
} from "@/lib/storyboardAgent";
import {
  useProjectStore,
  type AgentReceipt,
  type AiMessage,
  type ImagePage,
  type StoryMaterial,
} from "@/store/projectStore";

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
  const imagePages = useProjectStore((s) => s.imagePages);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const aiMessages = useProjectStore((s) => s.aiMessages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setIdeaText = useProjectStore((s) => s.setIdeaText);
  const setAiMessages = useProjectStore((s) => s.setAiMessages);
  const setStoryDesign = useProjectStore((s) => s.setStoryDesign);
  const addStoryMaterial = useProjectStore((s) => s.addStoryMaterial);
  const setReferenceImage = useProjectStore((s) => s.setReferenceImage);
  const toggleSelectedCharacter = useProjectStore(
    (s) => s.toggleSelectedCharacter,
  );
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
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const designOpen = useProjectStore((s) => s.workbenchDesignOpen);
  const setDesignOpen = useProjectStore((s) => s.setWorkbenchDesignOpen);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const availableCharacters = useMemo(
    () => characters.filter((character) => !character.isDraft),
    [characters],
  );

  const activePage = imagePages.find((page) => page.id === activePageId) ?? null;
  const activePageNumber = activePage
    ? imagePages.findIndex((page) => page.id === activePage.id) + 1
    : null;

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

  const appendAssistantReply = (reply: string, receipts?: AgentReceipt[]) => {
    const assistantMessage: AiMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: reply,
      createdAt: Date.now(),
      ...(receipts?.length ? { receipts } : {}),
    };
    setAiMessages(
      [...useProjectStore.getState().aiMessages, assistantMessage].slice(-40),
    );
  };

  const generatePageImage = async (pageId: string, runId?: number) => {
    const page = useProjectStore
      .getState()
      .imagePages.find((item) => item.id === pageId);
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
          !character.isDraft &&
          state.selectedCharacterIds.includes(character.id),
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
      if (runId != null && runId !== runIdRef.current) return;
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
      if (runId != null && runId !== runIdRef.current) return;
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.images.agentError"),
      );
    } finally {
      if (runId == null || runId === runIdRef.current) {
        setGeneratingPageId(null);
      }
    }
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    runIdRef.current += 1;
    setIsGenerating(false);
    setGeneratingPageId(null);
  };

  const runChatPlan = async (
    seed: string,
    attachmentHint?: ChatAttachment,
  ) => {
    setError("");
    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runIdRef.current;

    try {
      const state = useProjectStore.getState();
      const liveSelectedCharacters = state.characters.filter(
        (character) =>
          !character.isDraft &&
          state.selectedCharacterIds.includes(character.id),
      );

      const response = await runStoryboardAgentTurn({
        apiKey: state.poeApiKey,
        textModel: state.modelSettings.text,
        signal: controller.signal,
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

      if (runId !== runIdRef.current) return;

      const applied = applyAgentActions(
        response.data,
        storeBridge(),
        t("workflow.workbench.defaultReply"),
      );
      appendAssistantReply(applied.reply, applied.receipts);
      if (!state.ideaText.trim()) setIdeaText(seed);

      for (const pageId of applied.pagesToGenerate) {
        if (runId !== runIdRef.current) return;
        const pageIndex =
          useProjectStore
            .getState()
            .imagePages.findIndex((page) => page.id === pageId) + 1;
        const currentMessages = useProjectStore.getState().aiMessages;
        const last = currentMessages[currentMessages.length - 1];
        if (last?.role === "assistant") {
          const generatingReceipt: AgentReceipt = {
            type: "generating_image",
            pageNumber: pageIndex > 0 ? pageIndex : 1,
          };
          setAiMessages([
            ...currentMessages.slice(0, -1),
            {
              ...last,
              receipts: [...(last.receipts ?? []), generatingReceipt],
            },
          ]);
        }
        await generatePageImage(pageId, runId);
      }
    } catch (caught) {
      if (runId !== runIdRef.current) return;
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      setError(
        caught instanceof PoeApiError || caught instanceof Error
          ? caught.message
          : t("workflow.workbench.agentError"),
      );
    } finally {
      if (runId === runIdRef.current) {
        setIsGenerating(false);
        abortRef.current = null;
      }
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
      if (
        attachment.kind === "image" &&
        attachment.dataUrl &&
        !referenceImageDataUrl
      ) {
        setReferenceImage({
          name: attachment.name,
          dataUrl: attachment.dataUrl,
        });
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
    setDesignOpen(false);
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
    <div className="flex h-full min-h-0">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-5 sm:p-6">
            {!imagePages.length ? (
              <div className="grid min-h-[60vh] place-items-center text-center">
                <div className="max-w-sm">
                  <p className="text-[15px] font-medium text-foreground">
                    {t("workflow.workbench.emptyTitle")}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {t("workflow.workbench.emptyDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                        "group cursor-pointer overflow-hidden rounded-xl border bg-card transition-colors",
                        selected
                          ? "border-primary/45"
                          : "border-border/80 hover:border-border",
                      )}
                    >
                      <div
                        className={cn(
                          "relative bg-muted",
                          format === "post" ? "aspect-[4/5]" : "aspect-[9/16]",
                          "max-h-52 w-full",
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
                            <Clapperboard className="size-5 opacity-35" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
                          <GripVertical className="size-3 opacity-40" />
                          {index + 1}
                        </div>
                      </div>
                      <div className="space-y-1.5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[13px] font-medium text-foreground">
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
                            className="text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:text-foreground"
                            aria-label={t("workflow.workbench.deletePage")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {page.scene ||
                            page.idea ||
                            t("workflow.workbench.noScene")}
                        </p>
                        {page.dialogue && (
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/75">
                            “{page.dialogue}”
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    addImagePage({
                      title: t("workflow.workbench.untitledPage", {
                        number: imagePages.length + 1,
                      }),
                    })
                  }
                  className={cn(
                    "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/90 bg-transparent text-muted-foreground outline-none transition-colors hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground",
                    format === "post" ? "aspect-[4/5]" : "aspect-[9/16]",
                    "max-h-52",
                  )}
                >
                  <Plus className="size-5 opacity-60" />
                  <span className="text-[12px] font-medium">
                    {t("workflow.workbench.addPage")}
                  </span>
                </button>
              </div>
            )}
          </div>

          <DesignSheet
            open={designOpen}
            onClose={() => setDesignOpen(false)}
            onRedesign={() => void redesignAll()}
            isGenerating={isGenerating}
          />
        </div>

        {activePage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-detail-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setActivePageId(null);
            }}
          >
            <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
                <p id="page-detail-title" className="text-[15px] font-medium">
                  {t("workflow.workbench.pageDetail")}
                </p>
                <button
                  type="button"
                  onClick={() => setActivePageId(null)}
                  className="rounded-md p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                  aria-label={t("workflow.workbench.closePageDetail")}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                <div
                  className={cn(
                    "grid gap-4",
                    activePageImage
                      ? "lg:grid-cols-[220px_minmax(0,1fr)]"
                      : "",
                  )}
                >
                  {activePageImage && (
                    <div className="flex min-h-56 items-center justify-center rounded-xl bg-muted/50 p-3">
                      <img
                        src={activePageImage.url}
                        alt={activePageImage.alt}
                        className="max-h-72 w-full rounded-lg object-contain"
                      />
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["title", t("workflow.workbench.fields.title")],
                        ["scene", t("workflow.workbench.fields.scene")],
                        [
                          "characters",
                          t("workflow.workbench.fields.characters"),
                        ],
                        ["dialogue", t("workflow.workbench.fields.dialogue")],
                        [
                          "suggestedText",
                          t("workflow.workbench.fields.suggestedText"),
                        ],
                        [
                          "composition",
                          t("workflow.workbench.fields.composition"),
                        ],
                        [
                          "imagePrompt",
                          t("workflow.workbench.fields.imagePrompt"),
                        ],
                      ] as Array<[keyof ImagePage, string]>
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className={cn(
                          "block text-xs",
                          field === "imagePrompt" ? "sm:col-span-2" : "",
                        )}
                      >
                        <span className="font-medium text-muted-foreground">
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
                          className="mt-1 w-full resize-y rounded-lg border border-transparent bg-muted/50 px-3 py-2 text-sm outline-none focus:border-border focus:bg-background"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-lg"
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
                    className="rounded-lg"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          activePage.imagePrompt,
                        );
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

      <ChatPanel
        collapsed={chatCollapsed}
        onToggleCollapsed={() => setChatCollapsed((value) => !value)}
        messages={aiMessages}
        message={message}
        onMessageChange={setMessage}
        attachment={attachment}
        onClearAttachment={() => setAttachment(null)}
        onAttachmentChange={onAttachmentChange}
        availableCharacters={availableCharacters}
        selectedCharacterIds={selectedCharacterIds}
        onToggleCharacter={toggleSelectedCharacter}
        activePage={activePage}
        activePageNumber={activePageNumber}
        isGenerating={isGenerating}
        error={error}
        onSend={() => void sendMessage()}
        onCancel={cancelGeneration}
      />
    </div>
  );
}
