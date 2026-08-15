import {
  AtSign,
  Check,
  ChevronDown,
  Copy,
  MessageSquare,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import {
  MentionChipView,
  MentionComposer,
  type MentionComposerHandle,
} from "@/components/workbench/MentionComposer";
import {
  characterDisplayName,
  filterMentionableCharacters,
  findActiveMention,
  splitMentionParts,
} from "@/lib/characterMentions";
import { cn } from "@/lib/utils";
import type {
  AgentReceipt,
  AiMessage,
  Character,
  ChatSession,
  ImagePage,
  StoryMaterial,
} from "@/store/projectStore";

export interface ChatAttachment {
  name: string;
  type: string;
  dataUrl?: string;
  text?: string;
  kind: StoryMaterial["kind"];
}

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  messages: AiMessage[];
  message: string;
  onMessageChange: (value: string) => void;
  attachment: ChatAttachment | null;
  onClearAttachment: () => void;
  onAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  availableCharacters: Character[];
  onAddCharacter: (id: string) => void;
  activePage: ImagePage | null;
  activePageNumber: number | null;
  isGenerating: boolean;
  isDrawing?: boolean;
  error: string;
  onSend: () => void;
  onCancel: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onClearSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

type ChatBusyPhase = "thinking" | "writing" | "generatingImage" | "working";

function useChatBusyPhase(isGenerating: boolean, isDrawing: boolean) {
  const [phase, setPhase] = useState<"thinking" | "writing">("thinking");

  useEffect(() => {
    if (!isGenerating) {
      setPhase("thinking");
      return;
    }
    const timer = window.setTimeout(() => setPhase("writing"), 1600);
    return () => window.clearTimeout(timer);
  }, [isGenerating]);

  if (isDrawing) return "generatingImage" satisfies ChatBusyPhase;
  if (!isGenerating) return null;
  return phase;
}

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-4 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-4 first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: ReactNode;
  }) =>
    className ? (
      <code className="font-mono text-[12px]">{children}</code>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
        {children}
      </code>
    ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-1.5 overflow-x-auto rounded-lg bg-muted px-2.5 py-2 font-mono text-[12px] leading-relaxed first:mt-0 last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-2 mb-1 text-sm font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-2 mb-1 text-sm font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-2 mb-1 text-[13px] font-semibold first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-1.5 border-l-2 border-border pl-2.5 text-muted-foreground first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-border" />,
};

function formatCharacterBackground(background: string, fallback: string) {
  const text = background.trim();
  if (!text) return fallback;
  return text.replace(/([^\s])#/g, "$1 #").replace(/\s+/g, " ");
}

function CharacterThumb({
  character,
  className,
}: {
  character: Character;
  className?: string;
}) {
  return character.images[0]?.dataUrl ? (
    <img
      src={character.images[0].dataUrl}
      alt=""
      className={cn("size-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "grid size-full place-items-center bg-background",
        className,
      )}
    >
      <UserRound className="size-3 text-muted-foreground" />
    </span>
  );
}

function HighlightedUserText({
  text,
  characters,
  untitled,
}: {
  text: string;
  characters: Character[];
  untitled: string;
}) {
  const parts = splitMentionParts(text, characters, untitled);
  if (parts.length === 1 && parts[0]?.type === "text") return text;

  return (
    <>
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <MentionChipView
            key={`${part.value}-${index}`}
            character={part.character}
            name={part.value}
          />
        ) : (
          <span key={`text-${index}`}>{part.value}</span>
        ),
      )}
    </>
  );
}

function CopyReplyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some desktop webviews.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
      aria-label={copied ? t("workflow.workbench.copiedReply") : t("workflow.workbench.copyReply")}
      title={copied ? t("workflow.workbench.copiedReply") : t("workflow.workbench.copyReply")}
    >
      {copied ? (
        <Check className="size-3 text-primary" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}

function formatReceipt(
  receipt: AgentReceipt,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  switch (receipt.type) {
    case "set_design":
      return t("workflow.workbench.receipts.setDesign");
    case "upsert_pages":
      return receipt.mode === "replace"
        ? t("workflow.workbench.receipts.replacePages", { count: receipt.count })
        : t("workflow.workbench.receipts.mergePages", { count: receipt.count });
    case "update_page":
      return t("workflow.workbench.receipts.updatePages", {
        count: receipt.count,
      });
    case "add_page":
      return t("workflow.workbench.receipts.addPages", { count: receipt.count });
    case "remove_page":
      return t("workflow.workbench.receipts.removePages", {
        count: receipt.count,
      });
    case "reorder_pages":
      return t("workflow.workbench.receipts.reorderPages");
    case "generate_images":
      return t("workflow.workbench.receipts.generateImages", {
        count: receipt.count,
      });
    case "set_active_page":
      return t("workflow.workbench.receipts.setActivePage");
    case "generating_image":
      return t("workflow.workbench.receipts.generatingImage", {
        number: receipt.pageNumber,
      });
    default:
      return "";
  }
}

export function ChatPanel({
  collapsed,
  onToggleCollapsed,
  messages,
  message,
  onMessageChange,
  attachment,
  onClearAttachment,
  onAttachmentChange,
  availableCharacters,
  onAddCharacter,
  activePage,
  activePageNumber,
  isGenerating,
  isDrawing = false,
  error,
  onSend,
  onCancel,
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onClearSession,
  onDeleteSession,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<MentionComposerHandle>(null);
  const mentionItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const untitledCharacter = t("characters.untitled");
  const activeMention = findActiveMention(message, cursor);
  const mentionQuery = activeMention?.query ?? "";
  const mentionResults = useMemo(
    () =>
      filterMentionableCharacters(
        availableCharacters,
        mentionQuery,
        untitledCharacter,
      ),
    [availableCharacters, mentionQuery, untitledCharacter],
  );
  const mentionOpen =
    Boolean(activeMention) &&
    !mentionDismissed &&
    availableCharacters.length > 0;
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const sessionTitle =
    activeSession?.title.trim() || t("workflow.workbench.untitledSession");
  const busyPhase = useChatBusyPhase(isGenerating, isDrawing);
  const busyLabel = busyPhase
    ? t(
        busyPhase === "thinking"
          ? "workflow.workbench.statusThinking"
          : busyPhase === "writing"
            ? "workflow.workbench.statusWriting"
            : busyPhase === "generatingImage"
              ? "workflow.workbench.statusGeneratingImage"
              : "workflow.workbench.statusWorking",
      )
    : null;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isGenerating]);

  useEffect(() => {
    setHighlightIndex(0);
    setMentionDismissed(false);
  }, [mentionQuery, activeMention?.start]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [mentionOpen]);

  useEffect(() => {
    mentionItemRefs.current[highlightIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightIndex, mentionOpen]);

  useEffect(() => {
    if (!sessionMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !sessionMenuRef.current?.contains(event.target)
      ) {
        setSessionMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [sessionMenuOpen]);

  const applyMention = (character: Character) => {
    composerRef.current?.applyMention(character);
    onAddCharacter(character.id);
    setMentionDismissed(false);
    setHighlightIndex(0);
  };

  const startMention = () => {
    setMentionDismissed(false);
    composerRef.current?.startMention();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mentionOpen && mentionResults.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((index) => (index + 1) % mentionResults.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex(
          (index) =>
            (index - 1 + mentionResults.length) % mentionResults.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const selected = mentionResults[highlightIndex];
        if (selected) {
          event.preventDefault();
          applyMention(selected);
          return;
        }
      }
    }

    if (mentionOpen && event.key === "Escape") {
      event.preventDefault();
      setMentionDismissed(true);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center border-l border-border bg-card pt-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("workflow.workbench.expandChat")}
          title={t("workflow.workbench.expandChat")}
        >
          <PanelRightOpen className="size-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-[340px] min-w-[300px] shrink-0 flex-col border-l border-border bg-card">
      <div className="relative flex h-9 shrink-0 items-center gap-0.5 border-b border-border px-1.5">
        <div ref={sessionMenuRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSessionMenuOpen((open) => !open)}
            className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-muted"
            aria-expanded={sessionMenuOpen}
            aria-label={t("workflow.workbench.sessionList")}
          >
            <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
              {sessionTitle}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
          {sessionMenuOpen && (
            <div className="absolute top-[calc(100%+0.25rem)] left-0 z-30 w-[15.5rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
              <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
                {t("workflow.workbench.sessionList")}
              </p>
              <div className="max-h-56 overflow-y-auto">
                {sessions.map((session) => {
                  const selected = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "flex items-center rounded-lg",
                        selected ? "bg-muted" : "hover:bg-muted/70",
                      )}
                    >
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => {
                          onSelectSession(session.id);
                          setSessionMenuOpen(false);
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="truncate text-[12px] font-medium text-foreground">
                          {session.title.trim() ||
                            t("workflow.workbench.untitledSession")}
                        </span>
                      </button>
                      {sessions.length > 1 && (
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => onDeleteSession(session.id)}
                          className="mr-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={t("workflow.workbench.deleteSession")}
                          title={t("workflow.workbench.deleteSession")}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={isGenerating}
          onClick={onNewSession}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("workflow.workbench.newSession")}
          title={t("workflow.workbench.newSession")}
        >
          <Plus className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={isGenerating || messages.length === 0}
          onClick={onClearSession}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("workflow.workbench.clearSession")}
          title={t("workflow.workbench.clearSession")}
        >
          <Trash2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("workflow.workbench.collapseChat")}
          title={t("workflow.workbench.collapseChat")}
        >
          <PanelRightClose className="size-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 pb-3",
          messages.length || isGenerating ? "space-y-4" : "grid place-items-center",
        )}
      >
        {!messages.length && !isGenerating && (
          <div className="text-center">
            <p className="text-[13px] font-medium text-foreground">
              {t("workflow.workbench.chatEmptyTitle")}
            </p>
            <p className="mx-auto mt-1.5 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              {t("workflow.workbench.chatEmptyDescription")}
            </p>
          </div>
        )}

        {messages.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex flex-col gap-1",
              item.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[94%] text-[13px] leading-relaxed",
                item.role === "user"
                  ? "rounded-2xl bg-muted px-3.5 py-2 text-foreground"
                  : "text-foreground/90",
              )}
            >
              {item.role === "assistant" ? (
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {item.content}
                </Markdown>
              ) : (
                <HighlightedUserText
                  text={item.content}
                  characters={availableCharacters}
                  untitled={untitledCharacter}
                />
              )}
            </div>
            {item.role === "assistant" && item.content && (
              <CopyReplyButton text={item.content} />
            )}
            {item.role === "assistant" &&
              item.receipts &&
              item.receipts.length > 0 && (
                <ul className="space-y-0.5">
                  {item.receipts.map((receipt, index) => {
                    const label = formatReceipt(receipt, t);
                    if (!label) return null;
                    return (
                      <li
                        key={`${item.id}-receipt-${index}`}
                        className="text-[11px] text-muted-foreground/80"
                      >
                        {label}
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        ))}

        {busyLabel && (
          <p
            className="chat-status-flicker text-[12px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            {busyLabel}
          </p>
        )}
      </div>

      <div className="relative shrink-0 px-3 pt-1 pb-4">
        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {attachment && (
          <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Paperclip className="size-3 shrink-0 text-primary" />
            <span className="max-w-40 truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={onClearAttachment}
              className="cursor-pointer outline-none"
              aria-label={t("workflow.workbench.removeAttachment")}
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="relative">
          {mentionOpen && (
          <div
            id="character-mention-list"
            className="absolute inset-x-0 bottom-full z-30 mb-1.5 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
            role="listbox"
            aria-label={t("workflow.workbench.mentionPickerLabel")}
          >
            <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {t("workflow.workbench.mentionPickerLabel")}
            </p>
            <div className="max-h-52 overflow-y-auto">
              {mentionResults.length ? (
                mentionResults.map((character, index) => {
                  const name = characterDisplayName(
                    character,
                    untitledCharacter,
                  );
                  const active = index === highlightIndex;
                  return (
                    <button
                      key={character.id}
                      ref={(node) => {
                        mentionItemRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyMention(character);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none",
                        active ? "bg-muted" : "hover:bg-muted/70",
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                        <CharacterThumb character={character} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium leading-5 text-foreground">
                          {name}
                        </span>
                        <span className="block truncate text-[10px] leading-4 text-muted-foreground">
                          {formatCharacterBackground(
                            character.background,
                            t("characters.noBackground"),
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-2 py-2 text-[12px] text-muted-foreground">
                  {t("workflow.workbench.mentionEmpty")}
                </p>
              )}
            </div>
          </div>
        )}

        <div
          className="overflow-hidden rounded-xl border border-border/80 bg-background"
          aria-busy={Boolean(busyLabel)}
        >
          {activePage && activePageNumber != null && (
            <p className="border-b border-border/80 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
              {t("workflow.workbench.activePageChipShort", {
                number: activePageNumber,
              })}
            </p>
          )}

          <div className="flex flex-col">
            <MentionComposer
              composerRef={composerRef}
              value={message}
              onValueChange={(next, nextCursor) => {
                onMessageChange(next);
                setCursor(nextCursor);
              }}
              characters={availableCharacters}
              untitled={untitledCharacter}
              placeholder={t("workflow.workbench.chatPlaceholder")}
              mentionOpen={mentionOpen}
              onKeyDown={onKeyDown}
            />
            <div className="flex items-center justify-end gap-0.5 px-1 pb-1">
              {availableCharacters.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    startMention();
                  }}
                  title={t("workflow.workbench.mentionButton")}
                  aria-label={t("workflow.workbench.mentionButton")}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                >
                  <AtSign className="size-3.5" />
                </button>
              )}
              <label
                title={t("workflow.idea.attach")}
                aria-label={t("workflow.idea.attach")}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
              >
                <Paperclip className="size-3.5" />
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.txt,.md,.pdf,.doc,.docx,.csv"
                  className="sr-only"
                  onChange={onAttachmentChange}
                />
              </label>
              <button
                type="button"
                disabled={!isGenerating && !message.trim() && !attachment}
                onClick={isGenerating ? onCancel : onSend}
                aria-label={
                  isGenerating
                    ? t("workflow.workbench.cancel")
                    : t("workflow.idea.send")
                }
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground outline-none transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGenerating ? (
                  <Square className="size-2.5 fill-current" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </aside>
  );
}
