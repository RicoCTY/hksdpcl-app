import { useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Images,
  Plus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useProjectStore,
  type Character,
  type CharacterImage,
} from "@/store/projectStore";

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
  const setActiveCharacterId = useProjectStore(
    (s) => s.setActiveCharacterId,
  );
  const createCharacter = useProjectStore((s) => s.createCharacter);
  const deleteCharacter = useProjectStore((s) => s.deleteCharacter);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCharacter(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {t("characters.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("characters.listDescription")}
          </p>
        </div>
        <Button onClick={createCharacter} className="shrink-0">
          <Plus />
          <span className="hidden sm:inline">{t("characters.create")}</span>
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30 px-6 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
            <UsersRound className="size-7" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-foreground">
            {t("characters.emptyTitle")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("characters.emptyDescription")}
          </p>
          <Button onClick={createCharacter} className="mt-6">
            <Plus />
            {t("characters.create")}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => {
            const displayName =
              character.name.trim() || t("characters.untitled");
            const coverImage = character.images[0];
            return (
              <Card
                key={character.id}
                className="group relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-panel)]"
              >
                <button
                  type="button"
                  onClick={() => setActiveCharacterId(character.id)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {coverImage ? (
                      <img
                        src={coverImage.dataUrl}
                        alt={displayName}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground">
                        <UsersRound className="size-10" />
                      </div>
                    )}
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      <Images className="size-3.5" />
                      {t("characters.imageCount", {
                        count: character.images.length,
                      })}
                    </div>
                  </div>
                  <div className="p-5 pr-14">
                    <h2 className="truncate text-base font-bold text-foreground">
                      {displayName}
                    </h2>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {character.background.trim() ||
                        t("characters.noBackground")}
                    </p>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("characters.delete", { name: displayName })}
                  onClick={() => setDeleteTarget(character)}
                  className="absolute top-3 right-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 />
                </Button>
              </Card>
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
    </div>
  );
}

function CharacterEditor({ character }: { character: Character }) {
  const { t } = useTranslation();
  const setActiveCharacterId = useProjectStore(
    (s) => s.setActiveCharacterId,
  );
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const addCharacterImages = useProjectStore((s) => s.addCharacterImages);
  const removeCharacterImage = useProjectStore(
    (s) => s.removeCharacterImage,
  );
  const [isReadingImages, setIsReadingImages] = useState(false);

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

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCharacterId(null)}
            className="mb-4 -ml-3 text-muted-foreground"
          >
            <ArrowLeft />
            {t("characters.backToList")}
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {character.name.trim() || t("characters.newCharacter")}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setActiveCharacterId(null)}
          className="shrink-0"
        >
          {t("characters.done")}
        </Button>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("characters.imagesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="character-images"
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 text-center transition-colors hover:border-primary/60 hover:bg-accent/30"
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
              <ImagePlus className="size-7 text-primary" />
              <span className="mt-3 text-sm font-bold text-foreground">
                {isReadingImages
                  ? t("characters.readingImages")
                  : t("characters.addImages")}
              </span>
            </label>

            {character.images.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {character.images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeCharacterImage(character.id, image.id)
                      }
                      aria-label={t("characters.removeImage", {
                        name: image.name,
                      })}
                      className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {t("characters.noImages")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("characters.detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label
                htmlFor="character-name"
                className="text-sm font-semibold text-foreground"
              >
                {t("characters.nameLabel")}
              </label>
              <Input
                id="character-name"
                value={character.name}
                onChange={(event) =>
                  updateCharacter(character.id, { name: event.target.value })
                }
                placeholder={t("characters.namePlaceholder")}
                className="mt-2"
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
                value={character.background}
                onChange={(event) =>
                  updateCharacter(character.id, {
                    background: event.target.value,
                  })
                }
                placeholder={t("characters.backgroundPlaceholder")}
                className="mt-2 min-h-64 w-full resize-y rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
