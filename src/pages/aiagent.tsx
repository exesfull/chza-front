import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Bot,
  LoaderCircle,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  Users,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  useAiChats,
  type AiChatMessage,
  type AiChatSummary,
  type AiChatPayload,
  type AiAgentAction,
} from "@/hooks/use-ai-chats"

function formatChatTime(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMinutes < 1) return "только что"
  if (diffMinutes < 60) return `${diffMinutes} мин. назад`
  if (diffHours < 24) return `${diffHours} ч. назад`
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

function previewText(text: string | null | undefined) {
  if (!text) return "Пустой чат"
  return text.length > 72 ? `${text.slice(0, 72)}...` : text
}

function extractJsonPayload(content: string): string | null {
  const raw = content.trim()
  if (!raw) return null

  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
      continue
    }

    if (char === "{") {
      if (depth === 0) start = i
      depth += 1
      continue
    }

    if (char === "}") {
      if (depth > 0) {
        depth -= 1
        if (depth === 0 && start >= 0) {
          return raw.slice(start, i + 1)
        }
      }
    }
  }

  return null
}

function tryParseAssistantPayload(content: string): { message?: string; quick_replies?: unknown } | null {
  const raw = content.trim()
  const candidate = raw.startsWith("{") ? raw : extractJsonPayload(raw)
  if (!candidate) return null
  try {
    const parsed = JSON.parse(candidate)
    if (parsed && typeof parsed === "object") {
      return parsed as { message?: string; quick_replies?: unknown }
    }
  } catch {
    return null
  }
  return null
}

function extractQuickReplies(messages: AiChatMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const meta = message.meta as { quick_replies?: unknown; kind?: string } | null
    if (meta && Array.isArray(meta.quick_replies) && meta.quick_replies.length > 0) {
      return meta.quick_replies.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    }
    const parsed = tryParseAssistantPayload(message.content)
    if (parsed && Array.isArray(parsed.quick_replies) && parsed.quick_replies.length > 0) {
      return parsed.quick_replies.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    }
  }
  return []
}

export function AiAgentPage() {
  const { teamLogin, chatId } = useParams()
  const navigate = useNavigate()
  const {
    listChats,
    createChat,
    getChat,
    saveDraft,
    togglePublic,
    renameChat,
    deleteChat,
    sendMessage,
  } = useAiChats(teamLogin)

  const [chats, setChats] = useState<AiChatSummary[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [activeChat, setActiveChat] = useState<AiChatPayload | null>(null)
  const [loadingChat, setLoadingChat] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pageError, setPageError] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [publicConfirmOpen, setPublicConfirmOpen] = useState(false)
  const [publicTargetState, setPublicTargetState] = useState(false)
  const [chatSearch, setChatSearch] = useState("")
  const [agentActions, setAgentActions] = useState<AiAgentAction[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const draftTimerRef = useRef<number | null>(null)
  const currentUpdatedAtRef = useRef<string | null>(null)

  const activeChatId = chatId ?? activeChat?.chat.id ?? null

  const refreshChats = async () => {
    const items = await listChats()
    setChats(items)
    setLoadingChats(false)
    return items
  }

  const loadChat = async (id: string) => {
    setLoadingChat(true)
    const payload = await getChat(id)
    if (payload) {
      setActiveChat(payload)
      setDraft(payload.chat.draft_text || "")
      setRenameValue(payload.chat.title)
      currentUpdatedAtRef.current = payload.chat.updated_at
      setPageError("")
      setAgentActions([])
      setQuickReplies(extractQuickReplies(payload.messages))
    } else {
      setActiveChat(null)
      setDraft("")
      setRenameValue("")
      setAgentActions([])
      setQuickReplies([])
      setPageError("Чат не найден или недоступен")
    }
    setLoadingChat(false)
  }

  useEffect(() => {
    document.title = "AI агент"
  }, [])

  useEffect(() => {
    let mounted = true
    setLoadingChats(true)
    refreshChats().then((items) => {
      if (!mounted) return
      if (!chatId && items.length > 0) {
        navigate(`/teams/${teamLogin}/aiagent/${items[0].id}`, { replace: true })
      }
    })
    return () => {
      mounted = false
    }
  }, [teamLogin])

  useEffect(() => {
    if (!chatId) {
      if (!loadingChats && chats.length === 0) {
        setActiveChat(null)
        setDraft("")
        setRenameValue("")
        setAgentActions([])
        setQuickReplies([])
        setLoadingChat(false)
      }
      return
    }

    loadChat(chatId)
  }, [chatId])

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeChatId || sending || loadingChat) return

    const timer = window.setInterval(async () => {
      const fresh = await getChat(activeChatId)
      if (!fresh) return
      if (fresh.chat.updated_at !== currentUpdatedAtRef.current) {
        setActiveChat(fresh)
        setDraft(fresh.chat.draft_text || "")
        setRenameValue(fresh.chat.title)
        currentUpdatedAtRef.current = fresh.chat.updated_at
        setQuickReplies(extractQuickReplies(fresh.messages))
        setPageError("")
        await refreshChats()
      }
    }, 3000)

    return () => window.clearInterval(timer)
  }, [activeChatId, getChat, sending, loadingChat])

  const scheduleDraftSave = (value: string) => {
    if (!activeChatId) return
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current)
    }

    draftTimerRef.current = window.setTimeout(() => {
      saveDraft(activeChatId, value)
    }, 2000)
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    scheduleDraftSave(value)
  }

  const handleCreateChat = async () => {
    const created = await createChat()
    const items = await refreshChats()
    const targetId = created?.id || items[0]?.id
    if (targetId && teamLogin) {
      setAgentActions([])
      setQuickReplies([])
      navigate(`/teams/${teamLogin}/aiagent/${targetId}`)
    }
  }

  const handleSend = async (overrideText?: string) => {
    if (!activeChatId || sending || loadingChat) return
    const content = (overrideText ?? draft).trim()
    if (!content) return

    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }

    setQuickReplies([])
    setSending(true)
    setPageError("")

    const result = await sendMessage(activeChatId, content)
    if (result) {
      setActiveChat(result)
      setDraft(result.chat.draft_text || "")
      setRenameValue(result.chat.title)
      currentUpdatedAtRef.current = result.chat.updated_at
      setAgentActions(result.actions || [])
      setQuickReplies((result.quick_replies || []).filter((item) => item.trim() !== ""))
      await refreshChats()
    } else {
      setPageError("Не удалось отправить сообщение. Попробуйте ещё раз.")
    }

    setSending(false)
  }

  const handleRename = async () => {
    if (!activeChatId || renameSaving) return
    const trimmed = renameValue.trim()
    if (!trimmed) return

    setRenameSaving(true)
    const updated = await renameChat(activeChatId, trimmed)
    if (updated) {
      setActiveChat((prev) => (prev ? { ...prev, chat: { ...prev.chat, ...updated } } : prev))
      currentUpdatedAtRef.current = updated.updated_at
      await refreshChats()
      setSettingsOpen(false)
    } else {
      setPageError("Не удалось переименовать чат")
    }
    setRenameSaving(false)
  }

  const handleDelete = async () => {
    if (!activeChatId) return
    const ok = await deleteChat(activeChatId)
    if (ok) {
      const items = await refreshChats()
      setDeleteConfirmOpen(false)
      setSettingsOpen(false)
      setAgentActions([])
      setQuickReplies([])
      if (items.length > 0 && teamLogin) {
        navigate(`/teams/${teamLogin}/aiagent/${items[0].id}`, { replace: true })
      } else if (teamLogin) {
        navigate(`/teams/${teamLogin}/aiagent`, { replace: true })
        setActiveChat(null)
        setDraft("")
        setRenameValue("")
      }
    } else {
      setPageError("Не удалось удалить чат")
    }
  }

  const handleTogglePublic = async () => {
    if (!activeChatId) return
    const updated = await togglePublic(activeChatId, publicTargetState)
    if (updated) {
      setActiveChat((prev) => (prev ? { ...prev, chat: { ...prev.chat, ...updated } } : prev))
      currentUpdatedAtRef.current = updated.updated_at
      await refreshChats()
    } else {
      setPageError("Не удалось изменить доступ к чату")
    }
    setPublicConfirmOpen(false)
  }

  const openChat = (id: string) => {
    if (!teamLogin) return
    navigate(`/teams/${teamLogin}/aiagent/${id}`)
  }

  const chatsSorted = useMemo(() => {
    return [...chats].sort((a, b) => {
      const first = new Date((a.updated_at || "").replace(" ", "T")).getTime()
      const second = new Date((b.updated_at || "").replace(" ", "T")).getTime()
      return second - first
    })
  }, [chats])

  const canManageChat = Boolean(activeChat?.chat && activeChat.chat.id)
  const isPublic = activeChat?.chat.is_public ?? false

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <aside className="flex w-[320px] shrink-0 flex-col border-r bg-background/95">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
          <div>
            <div className="text-sm font-semibold">AI агент</div>
            <div className="text-xs text-muted-foreground">Диалоги команды</div>
          </div>
          <Button onClick={handleCreateChat} size="sm" className="gap-2">
            <Plus className="size-4" />
            Новый
          </Button>
        </div>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск чатов..."
              className="pl-9"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loadingChats ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl border bg-muted/30" />
              ))}
            </div>
          ) : chatsSorted.filter((item) => {
            const query = chatSearch.trim().toLowerCase()
            if (!query) return true
            return `${item.title} ${item.last_message_preview} ${item.draft_text}`.toLowerCase().includes(query)
          }).length > 0 ? (
            chatsSorted.filter((item) => {
              const query = chatSearch.trim().toLowerCase()
              if (!query) return true
              return `${item.title} ${item.last_message_preview} ${item.draft_text}`.toLowerCase().includes(query)
            }).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openChat(item.id)}
                className={cn(
                  "mb-2 w-full rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-muted/50",
                  activeChatId === item.id && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex size-9 items-center justify-center rounded-xl",
                    item.is_public ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}>
                    <Bot className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      {item.is_public && (
                        <Users className="size-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {previewText(item.last_message_preview || item.draft_text)}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {formatChatTime(item.updated_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Пока нет диалогов. Создайте первый чат.
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              disabled={!canManageChat}
              onClick={() => {
                setPublicTargetState(!isPublic)
                setPublicConfirmOpen(true)
              }}
              title={isPublic ? "Убрать публичный доступ" : "Открыть доступ команде"}
              className={cn(isPublic && "border-emerald-500 text-emerald-600 hover:text-emerald-700")}
            >
              <Users className={cn("size-4", isPublic && "text-emerald-600")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!canManageChat}
              onClick={() => {
                setRenameValue(activeChat?.chat.title || "")
                setSettingsOpen(true)
              }}
              title="Настройки"
              >
              <Settings2 className="size-4" />
            </Button>

            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">AI агент</div>
              <div className="truncate text-base font-semibold">
                {activeChat?.chat.title || (loadingChat ? "Загрузка..." : "Выберите чат")}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loadingChat ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 size-5 animate-spin" />
              Подключение к AI агенту...
            </div>
          ) : activeChat ? (
            <div className="mx-auto flex max-w-4xl flex-col gap-4">
              {activeChat.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {agentActions.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-3xl border bg-card px-4 py-3 text-sm shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ход агента
                    </div>
                    <div className="flex flex-col gap-2">
                      {agentActions.map((action, index) => (
                        <div
                          key={`${action.type}-${index}`}
                          className={cn(
                            "rounded-xl px-3 py-2 text-sm",
                            action.type === "error"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : action.type === "success"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : action.type === "preview"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                          )}
                        >
                          {action.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Чат думает...
                </div>
              )}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-2xl rounded-[2rem] border bg-card p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold">AI агент для команды</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Здесь вы можете вести рабочие диалоги с агентом, поручать ему поиск по спискам задач,
                      смотреть задачи, создавать и обновлять их, а также быстро продолжать диалог через кнопки-ответы.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Создайте первый чат, чтобы задать агенту задачу или попросить его собрать информацию.
                    </p>
                    <Button className="mt-5" onClick={handleCreateChat}>
                      <Plus className="mr-2 size-4" />
                      Создать чат
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
                <Bot className="mx-auto mb-3 size-10 text-primary" />
                <div className="text-lg font-semibold">Выберите чат</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Слева показаны ваши чаты. Можно выбрать существующий или создать новый.
                </div>
                <Button className="mt-5" onClick={handleCreateChat}>
                  <Plus className="mr-2 size-4" />
                  Создать чат
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-background/95 p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <Button
                    key={reply}
                    type="button"
                    variant="outline"
                    className="rounded-full"
                      onClick={() => {
                        setDraft(reply)
                        void handleSend(reply)
                      }}
                    disabled={sending || loadingChat || !activeChatId}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            )}

            <Textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyUp={(e) => handleDraftChange((e.target as HTMLTextAreaElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Напишите сообщение AI агенту..."
              className="min-h-[120px] resize-none rounded-2xl"
              disabled={!activeChatId || sending || loadingChat}
            />

            {pageError && <div className="text-sm text-destructive">{pageError}</div>}

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground" />
              <Button onClick={() => void handleSend()} disabled={!activeChatId || sending || loadingChat || !draft.trim()} className="gap-2">
                {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                Отправить
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Настройки чата</DialogTitle>
            <DialogDescription>Переименуйте чат или удалите его.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название</label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
            <Button type="button" className="gap-2" onClick={handleRename} disabled={renameSaving}>
              <Pencil className="size-4" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы точно уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Чат будет мягко удалён и исчезнет из списка. Сообщения сохранятся в базе до окончательной очистки.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publicConfirmOpen} onOpenChange={setPublicConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {publicTargetState ? "Открыть доступ всей команде?" : "Убрать публичный доступ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {publicTargetState
                ? "После подтверждения чат станет виден всей команде."
                : "После подтверждения чат снова станет приватным."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleTogglePublic}>Да</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user"
  const meta = message.meta as { kind?: string } | null
  const isPreview = meta?.kind === "preview"
  const parsed = isUser ? null : tryParseAssistantPayload(message.content)
  const displayContent = parsed?.message?.trim()
    ? parsed.message
    : parsed
      ? message.content.replace(extractJsonPayload(message.content) || "", "").trim()
      : message.content

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : isPreview
              ? "border border-amber-500/40 bg-amber-500/10 text-card-foreground"
              : "bg-card text-card-foreground border"
        )}
      >
        {isPreview && <div className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">План агента</div>}
        <div className="whitespace-pre-wrap leading-6">{displayContent}</div>
      </div>
    </div>
  )
}
