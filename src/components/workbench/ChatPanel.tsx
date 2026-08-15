import {
  LoaderCircle,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Square,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AgentReceipt,
  AiMessage,
  Character,
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
  selectedCharacterIds: string[];
  onToggleCharacter: (id: string) => void;
  activePage: ImagePage | null;
  activePageNumber: number | null;
  isGenerating: boolean;
  error: string;
  onSend: () => void;
  onCancel: () => void;
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
  selectedCharacterIds,
  onToggleCharacter,
  activePage,
  activePageNumber,
  isGenerating,
  error,
  onSend,
  onCancel,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isGenerating]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
      <div className="flex h-9 shrink-0 items-center justify-end px-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("workflow.workbench.collapseChat")}
          title={t("workflow.workbench.collapseChat")}
        >
          <PanelRightClose className="size-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3"
      >
        {!messages.length && !isGenerating && (
          <div className="pt-8 text-center">
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
              {item.content}
            </div>
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

        {isGenerating && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin text-primary" />
            {t("workflow.workbench.thinking")}
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pt-1 pb-4">
        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {(activePage || availableCharacters.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {activePage && activePageNumber != null && (
              <span className="inline-flex max-w-[9rem] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t("workflow.workbench.activePageChipShort", {
                  number: activePageNumber,
                })}
              </span>
            )}
            {availableCharacters.map((character) => {
              const selected = selectedCharacterIds.includes(character.id);
              return (
                <button
                  key={character.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleCharacter(character.id)}
                  title={character.name || t("characters.untitled")}
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full outline-none transition-opacity",
                    selected
                      ? "opacity-100 ring-1 ring-primary/40"
                      : "opacity-45 hover:opacity-80",
                  )}
                >
                  {character.images[0]?.dataUrl ? (
                    <img
                      src={character.images[0].dataUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center bg-muted">
                      <UserRound className="size-3 text-muted-foreground" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {attachment && (
          <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Paperclip className="size-3 shrink-0 text-primary" />
            <span className="max-w-40 truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={onClearAttachment}
              className="outline-none"
              aria-label={t("workflow.workbench.removeAttachment")}
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1 rounded-xl border border-border/80 bg-background p-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={t("workflow.workbench.chatPlaceholder")}
            className="min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground/70"
          />
          <label
            title={t("workflow.idea.attach")}
            aria-label={t("workflow.idea.attach")}
            className="mb-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          >
            <Paperclip className="size-3.5" />
            <input
              type="file"
              accept="image/*,video/*,audio/*,.txt,.md,.pdf,.doc,.docx,.csv"
              className="sr-only"
              onChange={onAttachmentChange}
            />
          </label>
          {isGenerating ? (
            <Button
              size="icon"
              variant="ghost"
              className="mb-0.5 size-8 shrink-0 rounded-lg"
              onClick={onCancel}
              aria-label={t("workflow.workbench.cancel")}
            >
              <Square className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="mb-0.5 size-8 shrink-0 rounded-lg"
              disabled={!message.trim() && !attachment}
              onClick={onSend}
              aria-label={t("workflow.idea.send")}
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
