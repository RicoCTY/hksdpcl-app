import { useState, type DragEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Images,
  Plus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useProjectStore,
  type Character,
  type CharacterImage,
} from "@/store/projectStore";
import companyLogo from "@/assets/company-logo.png";

const pageClass =
  "mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8";
const portraitRadius = "rounded-[1.75rem]";
const portraitEmptyClass = "character-portrait-empty";
const surfaceClass = "rounded-[2rem] bg-muted/40";

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

function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[clamp(1.85rem,3vw,2.4rem)] font-extrabold tracking-tight text-foreground">
          {title}
        </div>
        {description ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatusChip({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        ready
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {ready ? (
        <Check className="size-3.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-50" />
      )}
      {label}
    </span>
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

  return (
    <CharactersPage>
      <PageHeader
        title={t("characters.title")}
        description={
          characters.length > 0
            ? t("characters.rosterCount", { count: characters.length })
            : t("characters.listDescription")
        }
      />

      {characters.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          <div
            className={cn(
              surfaceClass,
              "grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:gap-12",
            )}
          >
            <button
              type="button"
              onClick={createCharacter}
              className={cn(
                "group relative mx-auto aspect-3/4 w-full max-w-[280px] overflow-hidden text-left shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 lg:mx-0",
                portraitRadius,
                portraitEmptyClass,
              )}
            >
              <div className="relative flex size-full flex-col items-center justify-center px-6 text-center">
                <span className="grid size-16 place-items-center rounded-3xl bg-card shadow-[var(--shadow-soft)]">
                  <img
                    src={companyLogo}
                    alt=""
                    className="size-10 object-contain"
                  />
                </span>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                  <Plus className="size-3.5" />
                  {t("characters.emptyCue")}
                </span>
              </div>
            </button>

            <div className="min-w-0 text-center lg:text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                {t("characters.emptyTitle")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground lg:mx-0">
                {t("characters.emptyDescription")}
              </p>
              <Button
                onClick={createCharacter}
                className="mt-6 rounded-full px-5"
              >
                <Plus />
                {t("characters.createFirst")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          <button
            type="button"
            onClick={createCharacter}
            className={cn(
              "group flex aspect-3/4 flex-col items-center justify-center border border-dashed border-border bg-muted/40 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-primary",
              portraitRadius,
            )}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-card shadow-sm transition-transform group-hover:scale-105">
              <Plus className="size-5" />
            </span>
            <span className="mt-3 text-sm font-bold">
              {t("characters.create")}
            </span>
          </button>

          {characters.map((character) => {
            const displayName =
              character.name.trim() || t("characters.untitled");
            const coverImage = character.images[0];
            return (
              <div
                key={character.id}
                className={cn(
                  "group relative aspect-3/4 overflow-hidden bg-muted shadow-[var(--shadow-soft)] ring-1 ring-border transition-transform hover:-translate-y-0.5",
                  portraitRadius,
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveCharacterId(character.id)}
                  className="absolute inset-0 text-left"
                >
                  {coverImage ? (
                    <img
                      src={coverImage.dataUrl}
                      alt={displayName}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className={cn(
                        "grid size-full place-items-center",
                        portraitEmptyClass,
                      )}
                    >
                      <UsersRound className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent px-3.5 pt-16 pb-3.5">
                    <h2 className="truncate text-sm font-bold text-white">
                      {displayName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                      <Images className="size-3.5" />
                      {t("characters.imageCount", {
                        count: character.images.length,
                      })}
                    </p>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("characters.delete", { name: displayName })}
                  onClick={() => setDeleteTarget(character)}
                  className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

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
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
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
              <Button onClick={confirmDelete}>
                {t("characters.deleteAction")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CharactersPage>
  );
}

function CharacterEditor({ character }: { character: Character }) {
  const { t } = useTranslation();
  const setActiveCharacterId = useProjectStore((s) => s.setActiveCharacterId);
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const completeCharacter = useProjectStore((s) => s.completeCharacter);
  const deleteCharacter = useProjectStore((s) => s.deleteCharacter);
  const addCharacterImages = useProjectStore((s) => s.addCharacterImages);
  const removeCharacterImage = useProjectStore((s) => s.removeCharacterImage);
  const [isReadingImages, setIsReadingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const hasName = Boolean(character.name.trim());
  const hasImages = character.images.length > 0;
  const isComplete = hasName && hasImages;
  const coverImage =
    character.images.find((image) => image.id === activePreviewId) ??
    character.images[0] ??
    null;

  const leaveEditor = () => {
    if (character.isDraft) {
      deleteCharacter(character.id);
    }
    setActiveCharacterId(null);
  };

  const handleImagesChange = (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    setIsReadingImages(true);
    void Promise.all(selectedFiles.map(readImageFile)).then((images) => {
      const validImages = images.filter(
        (image): image is Pick<CharacterImage, "name" | "dataUrl"> =>
          Boolean(image),
      );
      addCharacterImages(character.id, validImages);
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
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={leaveEditor}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft />
          {t("characters.backToList")}
        </Button>
        <Button
          variant={isComplete ? "default" : "outline"}
          onClick={() => {
            if (!isComplete) return;
            completeCharacter(character.id);
            setActiveCharacterId(null);
          }}
          disabled={!isComplete}
          title={!isComplete ? t("characters.completeHint") : undefined}
          className="shrink-0 rounded-full px-5"
        >
          {t("characters.done")}
        </Button>
      </div>

      <div
        className={cn(
          surfaceClass,
          "mt-6 grid flex-1 items-start gap-8 px-5 py-6 sm:gap-10 sm:px-8 sm:py-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]",
        )}
      >
        <aside className="space-y-4 lg:sticky lg:top-4">
          <label
            htmlFor="character-images"
            {...dragHandlers}
            className={cn(
              "group relative block aspect-3/4 cursor-pointer overflow-hidden transition-all",
              portraitRadius,
              hasImages
                ? "bg-muted shadow-[var(--shadow-soft)] ring-1 ring-border"
                : portraitEmptyClass,
              isDraggingImages &&
                "scale-[0.99] border-primary ring-2 ring-primary/20",
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

            {coverImage ? (
              <>
                <img
                  src={coverImage.dataUrl}
                  alt={coverImage.name}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 via-black/20 to-transparent px-4 pt-16 pb-4">
                  <p className="text-xs font-semibold text-white/90">
                    {t("characters.coverHint")}
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    {isReadingImages
                      ? t("characters.readingImages")
                      : t("characters.addMoreImages")}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex size-full flex-col items-center justify-center px-6 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-card text-primary shadow-[var(--shadow-soft)]">
                  <ImagePlus className="size-6" />
                </span>
                <span className="mt-4 text-sm font-bold text-foreground">
                  {isReadingImages
                    ? t("characters.readingImages")
                    : t("characters.addImages")}
                </span>
                <span className="mt-1.5 text-xs text-muted-foreground">
                  {t("characters.dropImages")}
                </span>
              </div>
            )}
          </label>

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("characters.referenceImages")}
              </p>
              <span className="text-xs font-semibold text-muted-foreground">
                {t("characters.imageCount", {
                  count: character.images.length,
                })}
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1">
              <label
                htmlFor="character-images"
                className="grid size-18 shrink-0 cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-primary"
              >
                <Plus className="size-5" />
                <span className="sr-only">{t("characters.addImages")}</span>
              </label>

              {character.images.map((image) => {
                const selected =
                  (activePreviewId ?? character.images[0]?.id) === image.id;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "group relative size-18 shrink-0 rounded-2xl p-[2px] transition-colors",
                      selected ? "bg-primary" : "bg-border",
                    )}
                  >
                    <div className="relative size-full overflow-hidden rounded-[14px] bg-muted">
                      <button
                        type="button"
                        onClick={() => setActivePreviewId(image.id)}
                        className="size-full"
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
                          removeCharacterImage(character.id, image.id);
                          if (activePreviewId === image.id) {
                            setActivePreviewId(null);
                          }
                        }}
                        aria-label={t("characters.removeImage", {
                          name: image.name,
                        })}
                        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">
            {character.isDraft
              ? t("characters.newCharacter")
              : t("characters.editCharacter")}
          </p>

          <label htmlFor="character-name" className="sr-only">
            {t("characters.nameLabel")}
          </label>
          <input
            id="character-name"
            value={character.name}
            onChange={(event) =>
              updateCharacter(character.id, { name: event.target.value })
            }
            placeholder={t("characters.namePlaceholder")}
            className="mt-2 w-full border-0 bg-transparent text-[clamp(1.85rem,3.4vw,2.4rem)] leading-[1.15] font-extrabold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/45"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusChip ready={hasName} label={t("characters.readyName")} />
            <StatusChip ready={hasImages} label={t("characters.readyImages")} />
            <span className="text-xs font-semibold text-muted-foreground">
              {isComplete
                ? t("characters.readyToSave")
                : t("characters.missingFields")}
            </span>
          </div>

          <div className="mt-8 border-t border-border/80 pt-6">
            <div className="flex items-end justify-between gap-3">
              <label
                htmlFor="character-background"
                className="text-sm font-bold text-foreground"
              >
                {t("characters.backgroundLabel")}
              </label>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {t("characters.backgroundHint")}
              </span>
            </div>
            <textarea
              id="character-background"
              value={character.background}
              onChange={(event) =>
                updateCharacter(character.id, {
                  background: event.target.value,
                })
              }
              placeholder={t("characters.backgroundPlaceholder")}
              className="mt-3 min-h-70 w-full resize-y rounded-3xl border border-transparent bg-card/80 px-4 py-4 text-[15px] leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border focus:bg-card focus:shadow-[var(--shadow-soft)] focus:ring-0"
            />
          </div>
        </section>
      </div>
    </CharactersPage>
  );
}
