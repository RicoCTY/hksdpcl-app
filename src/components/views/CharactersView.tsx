import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ImagePlus,
  Plus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useProjectStore,
  type Character,
  type CharacterImage,
} from "@/store/projectStore";

const pageClass =
  "mx-auto flex min-h-full w-full max-w-6xl flex-col px-6 py-8 sm:px-8 xl:px-10";

async function readImageFile(file: File) {
  const originalDataUrl = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  if (!originalDataUrl) return null;
  if (file.type === "image/svg+xml") {
    return { name: file.name, dataUrl: originalDataUrl };
  }

  const optimizedDataUrl = await new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1600;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(originalDataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/webp", 0.86);
      resolve(
        compressed.startsWith("data:image/") &&
          compressed.length < originalDataUrl.length
          ? compressed
          : originalDataUrl,
      );
    };
    image.onerror = () => resolve(originalDataUrl);
    image.src = originalDataUrl;
  });

  return { name: file.name, dataUrl: optimizedDataUrl };
}

function CharactersPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(pageClass, className)}>{children}</div>;
}

function CharacterEmpty({
  onCreate,
}: {
  onCreate: (seed?: {
    name?: string;
    background?: string;
    images?: Array<Pick<CharacterImage, "name" | "dataUrl">>;
  }) => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReadingImages, setIsReadingImages] = useState(false);

  const handleImagesChange = (files: FileList | null) => {
    if (!files?.length) return;
    setIsReadingImages(true);
    void Promise.all(Array.from(files).map(readImageFile)).then((images) => {
      const validImages = images.filter(
        (image): image is Pick<CharacterImage, "name" | "dataUrl"> =>
          Boolean(image),
      );
      setIsReadingImages(false);
      onCreate({ images: validImages });
    });
  };

  const actions = [
    {
      id: "upload",
      icon: ImagePlus,
      title: isReadingImages
        ? t("characters.readingImages")
        : t("characters.emptyUpload"),
      hint: t("characters.emptyUploadHint"),
      emphasized: true,
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: "blank",
      icon: Plus,
      title: t("characters.emptyBlank"),
      hint: t("characters.emptyBlankHint"),
      emphasized: false,
      onClick: () => onCreate(),
    },
  ] as const;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 pt-14 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
      <div className="flex flex-1 flex-col items-center rounded-[2rem] bg-muted/40 px-5 py-8 sm:px-8 sm:py-10">
        <motion.div
          className="text-center"
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <p className="text-xs font-semibold text-muted-foreground">
            {t("characters.title")}
          </p>
          <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight text-foreground">
            {t("characters.emptyTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("characters.emptyDescription")}
          </p>
        </motion.div>

        <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              handleImagesChange(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                disabled={isReadingImages}
                onClick={action.onClick}
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.08 + index * 0.05, duration: 0.35 }}
                whileHover={{ y: -2 }}
                className="relative rounded-[1.75rem] bg-card p-5 text-left shadow-[var(--shadow-soft)] ring-1 ring-border/70 transition-colors hover:ring-orange-200 disabled:pointer-events-none disabled:opacity-50"
              >
                <div
                  className={cn(
                    "mb-4 grid size-11 place-items-center rounded-2xl",
                    action.emphasized
                      ? "bg-accent text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="text-[clamp(1.25rem,2.2vw,1.5rem)] font-extrabold tracking-tight">
                  {action.title}
                </div>
                <div className="mt-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {action.hint}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CharactersView() {
  const characters = useProjectStore((s) => s.characters);
  const activeCharacterId = useProjectStore((s) => s.activeCharacterId);
  const activeCharacter = characters.find(
    (character) => character.id === activeCharacterId,
  );

  if (activeCharacter) {
    return <CharacterEditor character={activeCharacter} />;
  }

  return <CharacterList characters={characters} />;
}

function CharacterList({ characters }: { characters: Character[] }) {
  const { t } = useTranslation();
  const setActiveCharacterId = useProjectStore((s) => s.setActiveCharacterId);
  const createCharacter = useProjectStore((s) => s.createCharacter);
  const deleteCharacter = useProjectStore((s) => s.deleteCharacter);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCharacter(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (characters.length === 0) {
    return <CharacterEmpty onCreate={createCharacter} />;
  }

  return (
    <CharactersPage>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
        {characters.map((character) => {
          const displayName =
            character.name.trim() || t("characters.untitled");
          const coverImage = character.images[0];
          return (
            <li key={character.id}>
              <article className="group relative">
                <button
                  type="button"
                  onClick={() => setActiveCharacterId(character.id)}
                  className="block w-full cursor-pointer text-left"
                >
                  <div className="aspect-4/5 overflow-hidden rounded-[1.5rem] bg-muted shadow-[var(--shadow-soft)] ring-1 ring-border/70 transition-[box-shadow,ring-color] duration-200 group-hover:ring-orange-200">
                    {coverImage ? (
                      <img
                        src={coverImage.dataUrl}
                        alt={displayName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="character-portrait-empty grid size-full place-items-center">
                        <UsersRound className="size-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h2 className="mt-2.5 truncate px-1 text-[15px] font-semibold tracking-tight text-foreground">
                    {displayName}
                  </h2>
                </button>
                <button
                  type="button"
                  aria-label={t("characters.delete", { name: displayName })}
                  onClick={() => setDeleteTarget(character)}
                  className="absolute top-2.5 right-2.5 grid size-8 cursor-pointer place-items-center rounded-full bg-card/90 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/70 backdrop-blur-sm transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-character-title"
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2
              id="delete-character-title"
              className="text-lg font-bold text-foreground"
            >
              {t("characters.deleteTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("characters.deleteConfirm", {
                name: deleteTarget.name.trim() || t("characters.untitled"),
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                {t("characters.cancel")}
              </Button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-11 cursor-pointer rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t("characters.deleteAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </CharactersPage>
  );
}

function fingerprintDraft(draft: {
  name: string;
  background: string;
  images: CharacterImage[];
}) {
  return `${draft.name}\n${draft.background}\n${draft.images
    .map((image) => image.id)
    .join(",")}`;
}

function CharacterEditor({ character }: { character: Character }) {
  const { t } = useTranslation();
  const setActiveCharacterId = useProjectStore((s) => s.setActiveCharacterId);
  const deleteCharacter = useProjectStore((s) => s.deleteCharacter);
  const commitCharacter = useProjectStore((s) => s.commitCharacter);
  const setCharacterEditorSession = useProjectStore(
    (s) => s.setCharacterEditorSession,
  );
  const [draft, setDraft] = useState(() => ({
    name: character.name,
    background: character.background,
    images: character.images,
  }));
  const [baseline] = useState(() => fingerprintDraft(draft));
  const [isReadingImages, setIsReadingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const backgroundRef = useRef<HTMLTextAreaElement>(null);
  const pendingLeaveRef = useRef<(() => void) | null>(null);

  const hasName = Boolean(draft.name.trim());
  const hasImages = draft.images.length > 0;
  const isComplete = hasName && hasImages;
  const hasContent =
    hasName || hasImages || Boolean(draft.background.trim());
  const isDirty =
    fingerprintDraft(draft) !== baseline ||
    Boolean(character.isDraft && hasContent);
  const coverId = draft.images[0]?.id;
  const previewImage =
    draft.images.find((image) => image.id === activePreviewId) ??
    draft.images[0] ??
    null;
  const isCoverPreview = Boolean(previewImage && previewImage.id === coverId);

  useLayoutEffect(() => {
    const field = backgroundRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft.background]);

  const finishLeave = useCallback(() => {
    const next = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setShowUnsaved(false);
    next?.();
  }, []);

  const leaveWithoutSaving = useCallback(() => {
    if (character.isDraft) {
      deleteCharacter(character.id);
    }
    setActiveCharacterId(null);
    finishLeave();
  }, [
    character.id,
    character.isDraft,
    deleteCharacter,
    finishLeave,
    setActiveCharacterId,
  ]);

  const saveAndLeave = useCallback(() => {
    if (!commitCharacter(character.id, draft)) return;
    finishLeave();
  }, [character.id, commitCharacter, draft, finishLeave]);

  const requestLeave = useCallback(
    (onLeave?: () => void) => {
      pendingLeaveRef.current = onLeave ?? null;
      if (isDirty) {
        setShowUnsaved(true);
        return;
      }
      leaveWithoutSaving();
    },
    [isDirty, leaveWithoutSaving],
  );

  const requestBack = useCallback(() => {
    requestLeave();
  }, [requestLeave]);

  const cancelLeave = useCallback(() => {
    pendingLeaveRef.current = null;
    setShowUnsaved(false);
  }, []);

  useEffect(() => {
    setCharacterEditorSession({
      canSave: isComplete,
      back: requestBack,
      done: saveAndLeave,
      requestLeave,
    });
    return () => setCharacterEditorSession(null);
  }, [
    isComplete,
    requestBack,
    requestLeave,
    saveAndLeave,
    setCharacterEditorSession,
  ]);

  const handleImagesChange = (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    setIsReadingImages(true);
    void Promise.all(selectedFiles.map(readImageFile)).then((images) => {
      const validImages = images.filter(
        (image): image is Pick<CharacterImage, "name" | "dataUrl"> =>
          Boolean(image),
      );
      if (validImages.length) {
        setDraft((current) => ({
          ...current,
          images: [
            ...current.images,
            ...validImages.map((image) => ({
              ...image,
              id: `image-${crypto.randomUUID()}`,
            })),
          ],
        }));
      }
      setIsReadingImages(false);
    });
  };

  const handleImagesDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingImages(false);
    handleImagesChange(event.dataTransfer.files);
  };

  const dragHandlers = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDraggingImages(true);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (event.currentTarget === event.target) {
        setIsDraggingImages(false);
      }
    },
    onDrop: handleImagesDrop,
  };

  return (
    <CharactersPage>
      <div className="grid flex-1 items-start gap-10 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:gap-14">
        <aside className="space-y-5 lg:sticky lg:top-2">
          <div
            className={cn(
              "overflow-hidden rounded-2xl bg-card ring-1 ring-border",
              isDraggingImages && "ring-2 ring-primary",
            )}
          >
            <label
              htmlFor="character-images"
              {...dragHandlers}
              className={cn(
                "relative block aspect-3/4 cursor-pointer overflow-hidden bg-muted",
                !hasImages && "character-portrait-empty",
              )}
            >
              <input
                id="character-images"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  handleImagesChange(event.target.files);
                  event.currentTarget.value = "";
                }}
              />

              {previewImage ? (
                <img
                  src={previewImage.dataUrl}
                  alt={previewImage.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-muted-foreground">
                  <ImagePlus className="size-5 opacity-60" />
                  <span className="text-[12px] font-medium">
                    {isReadingImages
                      ? t("characters.readingImages")
                      : t("characters.dropImages")}
                  </span>
                </div>
              )}
            </label>

            {previewImage && !isCoverPreview && (
              <div className="flex items-center gap-1 border-t border-border p-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => {
                      const index = current.images.findIndex(
                        (image) => image.id === previewImage.id,
                      );
                      if (index <= 0) return current;
                      const nextImages = [...current.images];
                      const [cover] = nextImages.splice(index, 1);
                      nextImages.unshift(cover);
                      return { ...current, images: nextImages };
                    })
                  }
                  className="inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  {t("characters.setAsCover")}
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2.5 px-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("characters.referenceImages")}
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto p-2">
              <label
                htmlFor="character-images"
                className="grid size-16 shrink-0 cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-primary"
              >
                <Plus className="size-4" />
                <span className="sr-only">{t("characters.addImages")}</span>
              </label>

              {draft.images.map((image) => {
                const selected =
                  (activePreviewId ?? draft.images[0]?.id) === image.id;
                return (
                  <div
                    key={image.id}
                    className="group relative size-16 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setActivePreviewId(image.id)}
                      className={cn(
                        "size-16 cursor-pointer overflow-hidden rounded-xl bg-muted outline-2 outline-offset-2",
                        selected
                          ? "outline-primary"
                          : "outline-transparent group-hover:outline-foreground/20",
                      )}
                      aria-label={image.name}
                    >
                      <img
                        src={image.dataUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          images: current.images.filter(
                            (item) => item.id !== image.id,
                          ),
                        }));
                        if (activePreviewId === image.id) {
                          setActivePreviewId(null);
                        }
                      }}
                      aria-label={t("characters.removeImage", {
                        name: image.name,
                      })}
                      className="absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-md bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <div>
            <label
              htmlFor="character-name"
              className="text-sm font-semibold text-foreground"
            >
              {t("characters.nameLabel")}
            </label>
            <Input
              id="character-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder={t("characters.namePlaceholder")}
              className="mt-2 h-12 text-base font-semibold"
            />
          </div>

          <div>
            <label
              htmlFor="character-background"
              className="text-sm font-semibold text-foreground"
            >
              {t("characters.backgroundLabel")}
            </label>
            <textarea
              id="character-background"
              ref={backgroundRef}
              value={draft.background}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  background: event.target.value,
                }))
              }
              placeholder={t("characters.backgroundPlaceholder")}
              className="mt-2 min-h-52 w-full resize-none overflow-hidden rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:bg-card"
            />
          </div>
        </section>
      </div>

      {showUnsaved && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelLeave();
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-character-title"
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2
              id="unsaved-character-title"
              className="text-lg font-bold text-foreground"
            >
              {t("characters.unsavedTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("characters.unsavedDescription")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={cancelLeave}>
                {t("characters.cancel")}
              </Button>
              <Button variant="outline" onClick={leaveWithoutSaving}>
                {t("characters.discard")}
              </Button>
              <Button
                disabled={!isComplete}
                title={!isComplete ? t("characters.completeHint") : undefined}
                onClick={saveAndLeave}
              >
                {t("characters.save")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CharactersPage>
  );
}
