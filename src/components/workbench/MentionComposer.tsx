import {
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type Ref,
} from "react";
import { characterDisplayName, splitMentionParts } from "@/lib/characterMentions";
import { cn } from "@/lib/utils";
import type { Character } from "@/store/projectStore";

const CHIP_CLASS =
  "mention-chip inline-flex max-w-[12rem] cursor-pointer select-none items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 align-middle text-[12px] font-medium text-foreground";
const AVATAR_CLASS =
  "grid size-4 shrink-0 place-items-center overflow-hidden rounded-full bg-background";

export interface MentionComposerHandle {
  focus: () => void;
  startMention: () => void;
  applyMention: (character: Character) => void;
}

interface MentionComposerProps {
  value: string;
  onValueChange: (value: string, cursor: number) => void;
  characters: Character[];
  untitled: string;
  placeholder: string;
  mentionOpen: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  composerRef: Ref<MentionComposerHandle>;
}

function isMentionChip(node: Node): node is HTMLElement {
  return node instanceof HTMLElement && Boolean(node.dataset.mentionId);
}

function createMentionChip(character: Character, untitled: string) {
  const name = characterDisplayName(character, untitled);
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.mentionId = character.id;
  chip.dataset.mentionName = name;
  chip.className = CHIP_CLASS;

  const avatar = document.createElement("span");
  avatar.className = AVATAR_CLASS;
  const cover = character.images[0]?.dataUrl;
  if (cover) {
    const image = document.createElement("img");
    image.src = cover;
    image.alt = "";
    image.className = "size-full object-cover";
    avatar.append(image);
  } else {
    avatar.textContent = name.slice(0, 1);
    avatar.className = `${AVATAR_CLASS} text-[9px] text-muted-foreground`;
  }

  const label = document.createElement("span");
  label.className = "min-w-0 truncate";
  label.textContent = name;

  chip.append(avatar, label);
  chip.addEventListener("mousedown", (event) => {
    event.preventDefault();
    placeCaretAfter(chip);
  });
  return chip;
}

function serializeEditor(root: HTMLElement) {
  const selection = document.getSelection();
  const focusNode = selection?.anchorNode ?? null;
  const focusOffset = selection?.anchorOffset ?? 0;
  let text = "";
  let cursor = 0;
  let seenCaret = !root.contains(focusNode);

  const markCaret = (nextCursor: number) => {
    if (seenCaret) return;
    cursor = nextCursor;
    seenCaret = true;
  };

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? "";
      if (node === focusNode) markCaret(text.length + focusOffset);
      text += value;
      return;
    }

    if (isMentionChip(node)) {
      const token = `@${node.dataset.mentionName ?? ""}`;
      if (node === focusNode || (focusNode && node.contains(focusNode))) {
        markCaret(text.length + token.length);
      }
      text += token;
      return;
    }

    if (node.nodeName === "BR") {
      if (node === focusNode) markCaret(text.length);
      text += "\n";
      return;
    }

    if (
      node instanceof HTMLElement &&
      node !== root &&
      (node.nodeName === "DIV" || node.nodeName === "P") &&
      text &&
      !text.endsWith("\n")
    ) {
      text += "\n";
    }

    if (
      node === focusNode &&
      node instanceof HTMLElement &&
      focusNode === node
    ) {
      const children = Array.from(node.childNodes);
      children.slice(0, focusOffset).forEach(visit);
      markCaret(text.length);
      children.slice(focusOffset).forEach(visit);
      return;
    }

    Array.from(node.childNodes).forEach(visit);
  };

  visit(root);
  text = text.replace(/\u00A0/g, " ");
  if (!seenCaret) cursor = text.length;
  if (text.endsWith("\n") && !root.querySelector("br:last-child")) {
    text = text.slice(0, -1);
    if (cursor > text.length) cursor = text.length;
  }

  return { text, cursor };
}

function renderEditor(
  root: HTMLElement,
  value: string,
  characters: Character[],
  untitled: string,
) {
  root.replaceChildren();
  const parts = splitMentionParts(value, characters, untitled);
  if (!parts.length) return;

  for (const part of parts) {
    if (part.type === "mention" && part.character) {
      root.append(createMentionChip(part.character, untitled));
      continue;
    }
    const lines = part.value.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) root.append(document.createElement("br"));
      if (line) root.append(document.createTextNode(line));
    });
  }
}

function isBlankText(node: Node | null) {
  return (
    node?.nodeType === Node.TEXT_NODE &&
    !(node.textContent ?? "").replace(/\u00A0/g, " ").trim()
  );
}

function findAdjacentChip(
  root: HTMLElement,
  direction: "before" | "after",
) {
  const selection = document.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!range.collapsed) return null;

  const node = range.startContainer;
  const offset = range.startOffset;

  const step = (start: Node | null) => {
    let current = start;
    while (current && current !== root) {
      const sibling =
        direction === "before" ? current.previousSibling : current.nextSibling;
      if (!sibling) {
        current = current.parentNode;
        continue;
      }
      if (isMentionChip(sibling)) return sibling;
      if (isBlankText(sibling)) {
        current = sibling;
        continue;
      }
      return null;
    }
    return null;
  };

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    const side =
      direction === "before" ? text.slice(0, offset) : text.slice(offset);
    if (side.replace(/\u00A0/g, " ").trim()) return null;
    return step(node);
  }

  if (node instanceof HTMLElement) {
    const child =
      direction === "before"
        ? node.childNodes[offset - 1]
        : node.childNodes[offset];
    if (child && isMentionChip(child)) return child;
    if (isBlankText(child ?? null)) return step(child);
    return step(node);
  }

  return null;
}

function removeChip(chip: HTMLElement) {
  const extra = chip.nextSibling;
  if (
    extra?.nodeType === Node.TEXT_NODE &&
    (extra.textContent === "\u00A0" || extra.textContent === " ")
  ) {
    extra.remove();
  }
  const parent = chip.parentNode;
  chip.remove();
  if (parent instanceof HTMLElement && !parent.childNodes.length) {
    parent.append(document.createTextNode(""));
  }
}

function placeCaretAfter(node: Node) {
  const selection = document.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertNodeAtCaret(node: Node) {
  const selection = document.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  placeCaretAfter(node);
}

function insertLineBreak() {
  const selection = document.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const lineBreak = document.createElement("br");
  range.insertNode(lineBreak);
  if (!lineBreak.nextSibling) {
    lineBreak.after(document.createElement("br"));
  }
  placeCaretAfter(lineBreak);
}

export function MentionComposer({
  value,
  onValueChange,
  characters,
  untitled,
  placeholder,
  mentionOpen,
  onKeyDown,
  composerRef,
}: MentionComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  const sync = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = serializeEditor(editor);
    lastValueRef.current = next.text;
    onValueChange(next.text, next.cursor);
    editor.scrollTop = editor.scrollHeight;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastValueRef.current === value) return;
    renderEditor(editor, value, characters, untitled);
    lastValueRef.current = value;
  }, [value, characters, untitled]);

  useImperativeHandle(composerRef, () => ({
    focus: () => editorRef.current?.focus(),
    startMention: () => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const { text, cursor } = serializeEditor(editor);
      if (text[cursor - 1] !== "@") {
        insertNodeAtCaret(document.createTextNode("@"));
      }
      sync();
    },
    applyMention: (character) => {
      const editor = editorRef.current;
      const selection = document.getSelection();
      if (!editor || !selection?.rangeCount) return;
      editor.focus();

      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        const textNode = container as Text;
        const before = textNode.data.slice(0, range.startOffset);
        const at = before.lastIndexOf("@");
        if (at >= 0) {
          range.setStart(textNode, at);
          range.deleteContents();
        }
      }

      const chip = createMentionChip(character, untitled);
      const space = document.createTextNode("\u00A0");
      range.insertNode(space);
      range.insertNode(chip);
      placeCaretAfter(space);
      sync();
    },
  }));

  const empty = !value.trim();

  return (
    <div className="relative min-w-0 min-h-11 flex-1 overflow-hidden">
      {empty && (
        <p className="pointer-events-none absolute inset-x-2.5 top-1/2 -translate-y-1/2 truncate text-[13px] leading-none text-muted-foreground/70">
          {placeholder}
        </p>
      )}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-expanded={mentionOpen}
        aria-autocomplete={characters.length ? "list" : undefined}
        aria-controls={mentionOpen ? "character-mention-list" : undefined}
        aria-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onClick={sync}
        onKeyUp={sync}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          if (!text) return;
          insertNodeAtCaret(document.createTextNode(text));
          sync();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            insertLineBreak();
            sync();
            return;
          }
          const editor = editorRef.current;
          if (editor && (event.key === "Backspace" || event.key === "Delete")) {
            const selection = document.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (range && !range.collapsed) {
              const selectedChips = Array.from(
                editor.querySelectorAll("[data-mention-id]"),
              ).filter((chip) => range.intersectsNode(chip));
              if (selectedChips.length) {
                event.preventDefault();
                selectedChips.forEach((chip) => removeChip(chip as HTMLElement));
                range.deleteContents();
                sync();
                return;
              }
            }
            const chip =
              event.key === "Backspace"
                ? findAdjacentChip(editor, "before")
                : findAdjacentChip(editor, "after");
            if (chip) {
              event.preventDefault();
              const caretTarget = chip.previousSibling ?? editor;
              removeChip(chip);
              if (caretTarget === editor) {
                const next = document.createRange();
                next.setStart(editor, 0);
                next.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(next);
              } else {
                placeCaretAfter(caretTarget);
              }
              sync();
              return;
            }
          }
          onKeyDown(event);
        }}
        className={cn(
          "min-h-11 max-h-40 overflow-y-auto px-2.5 py-2 text-[13px] leading-relaxed wrap-anywhere whitespace-pre-wrap outline-none",
        )}
      />
    </div>
  );
}

export function MentionChipView({
  character,
  name,
}: {
  character?: Character;
  name: string;
}) {
  return (
    <span className={cn(CHIP_CLASS, "mx-0.5 bg-background")}>
      <span className={AVATAR_CLASS}>
        {character?.images[0]?.dataUrl ? (
          <img
            src={character.images[0].dataUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-[9px] text-muted-foreground">
            {name.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
