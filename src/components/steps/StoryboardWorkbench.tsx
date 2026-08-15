import {
  Clapperboard,
  Copy,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import {
  ChatPanel,
  type ChatAttachment,
} from "@/components/workbench/ChatPanel";
import { DesignSheet } from "@/components/workbench/DesignSheet";
import { cn } from "@/lib/utils";
import { parseMentionedCharacters } from "@/lib/characterMentions";
import { PoeApiError } from "@/lib/poeApi";
import {
  applyAgentActions,
  carouselRole,
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

const PAGE_DETAIL_FIELDS = [
  ["dialogue", "workflow.workbench.fields.dialogue"],
  ["scene", "workflow.workbench.fields.scene"],
  ["imagePrompt", "workflow.workbench.fields.imagePrompt"],
  ["characters", "workflow.workbench.fields.characters"],
  ["composition", "workflow.workbench.fields.composition"],
  ["suggestedText", "workflow.workbench.fields.suggestedText"],
] as const satisfies ReadonlyArray<readonly [keyof ImagePage, string]>;

export function StoryboardWorkbench() {
  const { t, i18n } = useTranslation();
  const format = useProjectStore((s) => s.format);
  const referenceImageDataUrl = useProjectStore((s) => s.referenceImageDataUrl);
  const characters = useProjectStore((s) => s.characters);
  const imagePages = useProjectStore((s) => s.imagePages);
  const generatedImages = useProjectStore((s) => s.generatedImages);
  const aiMessages = useProjectStore((s) => s.aiMessages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setIdeaText = useProjectStore((s) => s.setIdeaText);
  const setAiMessages = useProjectStore((s) => s.setAiMessages);
  const chatSessions = useProjectStore((s) => s.chatSessions);
  const activeChatSessionId = useProjectStore((s) => s.activeChatSessionId);
  const createChatSession = useProjectStore((s) => s.createChatSession);
  const setActiveChatSession = useProjectStore((s) => s.setActiveChatSession);
  const clearActiveChatSession = useProjectStore((s) => s.clearActiveChatSession);
  const deleteChatSession = useProjectStore((s) => s.deleteChatSession);
  const setStoryDesign = useProjectStore((s) => s.setStoryDesign);
  const addStoryMaterial = useProjectStore((s) => s.addStoryMaterial);
  const setReferenceImage = useProjectStore((s) => s.setReferenceImage);
  const setSelectedCharacterIds = useProjectStore(
    (s) => s.setSelectedCharacterIds,
  );
  const setImagePages = useProjectStore((s) => s.setImagePages);
  const updateImagePage = useProjectStore((s) => s.updateImagePage);
  const addImagePage = useProjectStore((s) => s.addImagePage);
  const removeImagePage = useProjectStore((s) => s.removeImagePage);
  const setActivePageId = useProjectStore((s) => s.setActivePageId);
  const setGeneratedImages = useProjectStore((s) => s.setGeneratedImages);
  const setSelectedImageId = useProjectStore((s) => s.setSelectedImageId);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const designOpen = useProjectStore((s) => s.workbenchDesignOpen);
  const setDesignOpen = useProjectStore((s) => s.setWorkbenchDesignOpen);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const pageAspect = format === "post" ? "aspect-[4/5]" : "aspect-[9/16]";

  const availableCharacters = useMemo(
    () => characters.filter((character) => !character.isDraft),
    [characters],
  );

  const activePage = imagePages.find((page) => page.id === activePageId) ?? null;
  const activePageNumber = activePage
    ? imagePages.findIndex((page) => page.id === activePage.id) + 1
    : null;

  useEffect(() => {
    if (!activePage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePageId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePage, setActivePageId]);

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
      const pageIndex = state.imagePages.findIndex((item) => item.id === pageId);
      const results = await generateStoryboardPageImage({
        apiKey: state.poeApiKey,
        imageModel: state.modelSettings.images,
        page,
        storyDesign: state.storyDesign,
        aspectRatio: state.aspectRatio,
        selectedCharacters: liveSelectedCharacters,
        referenceImageDataUrl: state.referenceImageDataUrl,
        pageIndex: pageIndex >= 0 ? pageIndex : 0,
        pageCount: state.imagePages.length,
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

    const mentionedCharacters = parseMentionedCharacters(
      nextMessage,
      availableCharacters,
      t("characters.untitled"),
    );
    if (mentionedCharacters.length) {
      const currentIds = useProjectStore.getState().selectedCharacterIds;
      setSelectedCharacterIds([
        ...new Set([
          ...currentIds,
          ...mentionedCharacters.map((character) => character.id),
        ]),
      ]);
    }

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

  return (
    <div className="flex h-full min-h-0">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-5 sm:p-6">
            {!imagePages.length ? (
              <div className="grid min-h-[60vh] place-items-center text-center">
                <div className="max-w-md">
                  <p className="text-[20px] font-medium tracking-tight text-foreground">
                    {t("workflow.workbench.emptyTitle")}
                  </p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
                    {t("workflow.workbench.emptyDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {imagePages.map((page, index) => {
                  const image = pageImage(page);
                  const selected = activePageId === page.id;
                  const generating = generatingPageId === page.id;
                  const role = carouselRole(index, imagePages.length);
                  return (
                    <article
                      key={page.id}
                      onClick={() => setActivePageId(page.id)}
                      aria-label={
                        page.title ||
                        t("workflow.workbench.untitledPage", {
                          number: index + 1,
                        })
                      }
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-xl border bg-muted transition-colors",
                        pageAspect,
                        selected
                          ? "border-primary/45"
                          : "border-border/80 hover:border-border",
                      )}
                    >
                      {image ? (
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="size-full object-contain"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <Clapperboard className="size-5 opacity-35" />
                        </div>
                      )}
                      {generating && (
                        <div className="absolute inset-0 grid place-items-center bg-background/45">
                          <LoaderCircle className="size-5 animate-spin text-foreground/70" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <div className="inline-flex items-center rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
                          {index + 1}
                        </div>
                        {role !== "knowledge" && (
                          <div
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                              role === "hook"
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground",
                            )}
                          >
                            {t(`workflow.workbench.roles.${role}`)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeImagePage(page.id);
                        }}
                        className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:text-foreground"
                        aria-label={t("workflow.workbench.deletePage")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
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
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/90 bg-transparent text-muted-foreground outline-none transition-colors hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground",
                    pageAspect,
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
            <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
                <p id="page-detail-title" className="text-[15px] font-medium">
                  {t("workflow.workbench.untitledPage", {
                    number: activePageNumber ?? 1,
                  })}
                  {activePageNumber != null && (
                    <span className="ml-2 text-[12px] font-medium text-muted-foreground">
                      {t(
                        `workflow.workbench.roles.${carouselRole(
                          activePageNumber - 1,
                          imagePages.length,
                        )}`,
                      )}
                    </span>
                  )}
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
              <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
                <div className="flex min-h-0 flex-col gap-3 border-b border-border p-4 sm:p-5 lg:border-r lg:border-b-0">
                  <div className="relative flex min-h-48 flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/50 p-3 max-lg:max-h-[42vh]">
                    {activePageImage ? (
                      <img
                        src={activePageImage.url}
                        alt={activePageImage.alt}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="grid size-full min-h-48 place-items-center text-muted-foreground">
                        <Clapperboard className="size-6 opacity-35" />
                      </div>
                    )}
                    {generatingPageId === activePage.id && (
                      <div className="absolute inset-0 grid place-items-center bg-background/45">
                        <LoaderCircle className="size-6 animate-spin text-foreground/70" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                <div className="min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {(
                    (activePageNumber === 1
                      ? ([
                          ["title", "workflow.workbench.fields.title"],
                          ...PAGE_DETAIL_FIELDS,
                        ] as const)
                      : PAGE_DETAIL_FIELDS)
                  ).map(([field, labelKey]) => (
                    <label key={field} className="block">
                      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                        {t(labelKey)}
                      </span>
                      {field === "title" && (
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground/80">
                          {t("workflow.workbench.fields.titleHint")}
                        </span>
                      )}
                      {field === "dialogue" && (
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground/80">
                          {t("workflow.workbench.fields.dialogueHint")}
                        </span>
                      )}
                      <AutoGrowTextarea
                        readOnly
                        tabIndex={-1}
                        value={String(activePage[field] ?? "")}
                        className="mt-1.5 w-full cursor-default rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground outline-none"
                      />
                    </label>
                  ))}
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
        onAddCharacter={(characterId) => {
          const current = useProjectStore.getState().selectedCharacterIds;
          if (current.includes(characterId)) return;
          setSelectedCharacterIds([...current, characterId]);
        }}
        activePage={activePage}
        activePageNumber={activePageNumber}
        isGenerating={isGenerating}
        isDrawing={Boolean(generatingPageId)}
        error={error}
        onSend={() => void sendMessage()}
        onCancel={cancelGeneration}
        sessions={chatSessions}
        activeSessionId={activeChatSessionId}
        onNewSession={() => {
          createChatSession();
          setMessage("");
          setAttachment(null);
          setError("");
        }}
        onSelectSession={(sessionId) => {
          setActiveChatSession(sessionId);
          setMessage("");
          setAttachment(null);
          setError("");
        }}
        onClearSession={() => {
          clearActiveChatSession();
          setMessage("");
          setAttachment(null);
          setError("");
        }}
        onDeleteSession={(sessionId) => {
          deleteChatSession(sessionId);
          setMessage("");
          setAttachment(null);
          setError("");
        }}
      />
    </div>
  );
}
