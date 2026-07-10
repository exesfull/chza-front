import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Check,
  Clock3,
  Edit3,
  Link2,
  ListTodo,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  History,
  User,
  DollarSign,
  Video,
  FileText,
  X,
} from "lucide-react"
import type { TaskColumn } from "@/types/task"
import type { TaskCardData, TaskChatMessage, TaskActivityLog } from "@/hooks/use-task-lists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { TaskWidget } from "@/types/task"
import { cn } from "@/lib/utils"

type TaskTab = "chat" | "info" | "history"
type WidgetType = "date" | "text" | "link" | "email" | "phone" | "fio" | "money" | "assignee"
const RUBLE_COLOR_OPTIONS = [
  "#111111",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
]

interface TaskDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskData: TaskCardData | null
  columns: TaskColumn[]
  onUpdateText: (taskId: string, text: string) => Promise<boolean> | boolean
  onUpdateDescription: (taskId: string, desc: string) => Promise<boolean> | boolean
  onUpdateDeadline: (taskId: string, deadline: string) => Promise<boolean> | boolean
  onUpdatePriority: (taskId: string, priority: string) => Promise<boolean> | boolean
  onUpdateColumn: (taskId: string, columnId: string) => Promise<boolean> | boolean
  onToggleTask: (taskId: string) => void
  onArchiveTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onSendMessage: (taskId: string, content: string, files?: File[]) => Promise<TaskChatMessage | null>
  onEditMessage: (messageId: string, content: string) => Promise<boolean> | boolean
  onDeleteMessage: (messageId: string) => Promise<boolean> | boolean
  onEditAttachment: (attachmentId: string, fileName: string) => Promise<boolean> | boolean
  onDeleteAttachment: (attachmentId: string) => Promise<boolean> | boolean
  onUpsertWidget: (payload: { task_id: string; widget_id?: string; type: WidgetType; title: string; value?: string; data?: Record<string, unknown> | null }) => Promise<boolean> | boolean
  onDeleteWidget: (widgetId: string) => Promise<boolean> | boolean
  widgetDialogOpen: boolean
  onWidgetDialogOpenChange: (open: boolean) => void
  initialTab?: TaskTab
  teamMembers?: Array<{ id: string; first_name: string; last_name: string; img_url: string | null }>
}

function formatTaskDate(value: string | null | undefined): string {
  if (!value) return "Не задано"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Не задано"
  return format(parsed, "d MMM yyyy, HH:mm", { locale: ru })
}

function fileKindLabel(kind?: string | null): string {
  switch (kind) {
    case "image":
      return "Изображение"
    case "video":
      return "Видео"
    case "text":
      return "Текст"
    case "archive":
      return "Архив"
    case "document":
      return "Документ"
    case "pdf":
      return "PDF"
    case "spreadsheet":
      return "Таблица"
    case "presentation":
      return "Презентация"
    case "code":
      return "Код"
    default:
      return "Файл"
  }
}

function formatBytes(bytes: number | null | undefined): string {
  const value = Number(bytes || 0)
  if (value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const size = value / Math.pow(1024, index)
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`
}

const WIDGET_OPTIONS: Array<{
  type: WidgetType
  title: string
  description: string
  icon: typeof Clock3
  className: string
}> = [
  { type: "text", title: "Текст", description: "Просто текстовая заметка", icon: Pencil, className: "from-slate-500 to-slate-700" },
  { type: "date", title: "Дата", description: "Дата и время", icon: Clock3, className: "from-sky-500 to-cyan-600" },
  { type: "link", title: "Ссылка", description: "URL или переход", icon: Link2, className: "from-emerald-500 to-green-600" },
  { type: "email", title: "Почта", description: "Email адрес", icon: Mail, className: "from-indigo-500 to-violet-600" },
  { type: "phone", title: "Телефон", description: "Номер телефона", icon: Phone, className: "from-amber-500 to-orange-600" },
  { type: "fio", title: "ФИО", description: "Имя и фамилия", icon: User, className: "from-pink-500 to-rose-600" },
  { type: "money", title: "Сумма", description: "Сумма с цветом рубля", icon: DollarSign, className: "from-teal-500 to-cyan-600" },
  { type: "assignee", title: "Ответственный", description: "Пользователь команды", icon: User, className: "from-fuchsia-500 to-purple-600" },
]

function getDefaultWidgetTitle(type: WidgetType): string {
  switch (type) {
    case "date":
      return "Дата"
    case "text":
      return "Текст"
    case "link":
      return "Ссылка"
    case "email":
      return "Почта"
    case "phone":
      return "Телефон"
    case "fio":
      return "ФИО"
    case "money":
      return "Сумма"
    case "assignee":
      return "Ответственный"
    default:
      return "Виджет"
  }
}

function renderHistoryEntry(entry: TaskActivityLog) {
  return (
    <div key={entry.id} className="rounded-xl border bg-background/60 p-3">
      <p className="text-sm font-medium">{entry.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatTaskDate(entry.created_at)}</p>
    </div>
  )
}

function WidgetBadge({ widget, onSave }: { widget: TaskWidget; onSave: (widgetId: string, value: string) => Promise<boolean> | boolean }) {
  const [currentValue, setCurrentValue] = useState(widget.value || "")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setCurrentValue(widget.value || "")
  }, [widget.value])

  const moneyColor =
    typeof widget.data?.color === "string"
      ? String(widget.data.color)
      : typeof widget.data?.ruble_color === "string"
        ? String(widget.data.ruble_color)
        : undefined
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-1 text-xs"
      >
        {widget.type === "money" ? (
          <span className="font-semibold" style={moneyColor ? { color: moneyColor } : undefined}>₽</span>
        ) : null}
        <span>{currentValue || "Виджет"}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{widget.title}</h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <Input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="Значение" />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button onClick={async () => { await onSave(widget.id, currentValue); setOpen(false) }}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function TaskDetailSheet({
  open,
  onOpenChange,
  taskData,
  columns,
  onUpdateText,
  onUpdateDescription,
  onUpdateDeadline,
  onUpdatePriority,
  onUpdateColumn,
  onToggleTask,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onEditAttachment,
  onDeleteAttachment,
  onUpsertWidget,
  onDeleteWidget,
  widgetDialogOpen,
  onWidgetDialogOpenChange,
  initialTab = "chat",
  teamMembers = [],
}: TaskDetailSheetProps) {
  const task = taskData?.task || null
  const [tab, setTab] = useState<TaskTab>("chat")
  const [draftTitle, setDraftTitle] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [draftColumnId, setDraftColumnId] = useState("")
  const [draftPriority, setDraftPriority] = useState("")
  const [draftDeadline, setDraftDeadline] = useState("")
  const [chatText, setChatText] = useState("")
  const [sending, setSending] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; name: string }>>([])
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [widgetStep, setWidgetStep] = useState<"select" | "form">("select")
  const [widgetType, setWidgetType] = useState<WidgetType>("text")
  const [widgetValue, setWidgetValue] = useState("")
  const [widgetDate, setWidgetDate] = useState("")
  const [widgetColor, setWidgetColor] = useState("#111111")
  const [widgetAssignee, setWidgetAssignee] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!task) return
    setDraftTitle(task.title || "")
    setDraftDescription(task.description || "")
    setDraftColumnId(task.column_id || "")
    setDraftPriority(task.priority || "")
    setDraftDeadline(task.deadline_date ? task.deadline_date.slice(0, 16) : "")
  }, [task?.id])

  useEffect(() => {
    if (!open) {
      setTab("chat")
      setChatText("")
      setSelectedFiles([])
      setEditingMessageId(null)
      setEditingMessageText("")
      onWidgetDialogOpenChange(false)
    }
  }, [open, onWidgetDialogOpenChange])

  useEffect(() => {
    if (open) {
      setTab(initialTab)
    }
  }, [open, initialTab])

  useEffect(() => {
    if (!widgetDialogOpen) {
      setWidgetStep("select")
      setWidgetType("text")
      setWidgetValue("")
      setWidgetDate("")
      setWidgetColor("#111111")
      setWidgetAssignee("")
    }
  }, [widgetDialogOpen])

  const currentColumnName = useMemo(() => columns.find((col) => col.id === draftColumnId)?.name || "Без этапа", [columns, draftColumnId])
  const widgets = taskData?.widgets || []

  const handleSend = async () => {
    if (!task || (!chatText.trim() && selectedFiles.length === 0)) return
    setSending(true)
    try {
      const files = selectedFiles.map((item) => item.file)
      const sent = await onSendMessage(task.id, chatText.trim(), files)
      if (sent) {
        setChatText("")
        setSelectedFiles([])
      }
    } finally {
      setSending(false)
    }
  }

  const saveInfo = async () => {
    if (!task) return
    if (draftTitle.trim()) await onUpdateText(task.id, draftTitle.trim())
    await onUpdateDescription(task.id, draftDescription.trim())
    await onUpdatePriority(task.id, draftPriority)
    if (draftColumnId && draftColumnId !== task.column_id) await onUpdateColumn(task.id, draftColumnId)
    if (draftDeadline) await onUpdateDeadline(task.id, new Date(draftDeadline).toISOString())
  }

  const handleWidgetTypeSelect = (type: WidgetType) => {
    setWidgetType(type)
    setWidgetStep("form")
    setWidgetValue("")
    setWidgetDate("")
    setWidgetColor("#111111")
    setWidgetAssignee("")
  }

  const handleWidgetSave = async () => {
    if (!task) return

    const title = getDefaultWidgetTitle(widgetType)
    let value = ""
    let data: Record<string, unknown> | null = null

    switch (widgetType) {
      case "text":
        value = widgetValue.trim()
        if (!value) return
        break
      case "date":
        value = widgetDate ? new Date(widgetDate).toISOString() : ""
        if (!value) return
        data = { mode: "date" }
        break
      case "link":
      case "email":
      case "phone":
      case "fio":
        value = widgetValue.trim()
        if (!value) return
        data = { mode: widgetType }
        break
      case "money":
        value = widgetValue.trim()
        if (!value) return
        data = { ruble_color: widgetColor }
        break
      case "assignee":
        value = widgetAssignee
        if (!value) return
        data = { mode: "assignee" }
        break
      default:
        break
    }

    const ok = await onUpsertWidget({
      task_id: task.id,
      type: widgetType,
      title,
      value,
      data,
    })
    if (ok) {
      handleWidgetDialogOpenChange(false)
    }
  }

  const handleWidgetDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setWidgetStep("select")
    }
    onWidgetDialogOpenChange(nextOpen)
  }

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-3xl p-0">
          <div className="flex h-full items-center justify-center text-muted-foreground">Загрузка задачи...</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-5xl p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              {task.closed_at && <Badge variant="secondary">Выполнена</Badge>}
              {task.priority && <Badge variant="outline">{task.priority}</Badge>}
            </div>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1"><ListTodo className="size-4" />{currentColumnName}</span>
              <span className="flex items-center gap-1"><Clock3 className="size-4" />{formatTaskDate(task.deadline_date)}</span>
            </SheetDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              {widgets.map((widget) => (
                <WidgetBadge
                  key={widget.id}
                  widget={widget}
                  onSave={async (widgetId, value) => !!(await onUpsertWidget({
                    task_id: task.id,
                    widget_id: widgetId,
                    type: widget.type as WidgetType,
                    title: widget.title,
                    value,
                    data: widget.data,
                  }))}
                />
              ))}
            </div>
          </SheetHeader>

          <div className="flex items-center gap-2 border-b px-6 py-3">
            {[
              { key: "chat" as const, label: "Чат", icon: MessageSquare },
              { key: "info" as const, label: "Инфо", icon: Pencil },
              { key: "history" as const, label: "История", icon: History },
            ].map(({ key, label, icon: Icon }) => (
              <Button key={key} variant={tab === key ? "default" : "outline"} size="sm" onClick={() => setTab(key)}>
                <Icon className="mr-2 size-4" />
                {label}
              </Button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {tab === "chat" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-auto px-6 py-4">
                  <div className="flex flex-col gap-3">
                    {(taskData?.messages || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Пока нет сообщений в чате этой задачи.
                      </div>
                    ) : (
                      taskData?.messages.filter((message) => !message.is_deleted).map((message) => (
                        <div key={message.id} className="rounded-2xl border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {editingMessageId === message.id ? (
                                <Textarea
                                  value={editingMessageText}
                                  onChange={(e) => setEditingMessageText(e.target.value)}
                                  rows={3}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatTaskDate(message.created_at)}
                                {message.edited_at ? " • отредактировано" : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {editingMessageId === message.id ? (
                                <>
                                  <Button size="icon" variant="ghost" onClick={async () => {
                                    await onEditMessage(message.id, editingMessageText)
                                    setEditingMessageId(null)
                                  }}>
                                    <Check className="size-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => { setEditingMessageId(null); setEditingMessageText("") }}>
                                    <X className="size-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" onClick={() => { setEditingMessageId(message.id); setEditingMessageText(message.content) }}>
                                    <Edit3 className="size-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => void onDeleteMessage(message.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {message.attachments?.length ? (
                            <div className="mt-3 flex flex-col gap-2">
                              {message.attachments.map((attachment) => {
                                const isImage = attachment.file_kind === "image"
                                const isVideo = attachment.file_kind === "video"
                                return (
                                  <div key={attachment.id} className="rounded-xl border p-3">
                                    <div className="flex items-center gap-3">
                                      {isImage ? (
                                        <a href={attachment.preview_url || attachment.download_url || "#"} target="_blank" rel="noreferrer" className="block h-14 w-14 overflow-hidden rounded-lg border">
                                          <img src={attachment.preview_url || attachment.download_url || ""} alt={attachment.file_name} className="h-full w-full object-cover" />
                                        </a>
                                      ) : isVideo ? (
                                        <Video className="size-8 text-muted-foreground" />
                                      ) : (
                                        <FileText className="size-8 text-muted-foreground" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                                        <p className="text-xs text-muted-foreground">{fileKindLabel(attachment.file_kind)} • {formatBytes(attachment.size_bytes)}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" asChild>
                                          <a href={attachment.download_url || "#"} target="_blank" rel="noreferrer">↓</a>
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={async () => {
                                          const next = window.prompt("Новое название файла", attachment.file_name)
                                          if (next) await onEditAttachment(attachment.id, next)
                                        }}>
                                          <Pencil className="size-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => void onDeleteAttachment(attachment.id)}>
                                          <Trash2 className="size-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    {isVideo && attachment.preview_url && (
                                      <video className="mt-3 w-full rounded-xl" controls>
                                        <source src={attachment.preview_url} />
                                      </video>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="border-t p-4">
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 flex flex-col gap-2">
                      {selectedFiles.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          <Paperclip className="size-4 text-muted-foreground" />
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const next = [...selectedFiles]
                              next[index] = { ...item, name: e.target.value }
                              setSelectedFiles(next)
                            }}
                            className="h-8 flex-1"
                          />
                          <span className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      placeholder="Напишите сообщение..."
                      rows={3}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void handleSend()
                        }
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setSelectedFiles((prev) => [...prev, ...files.map((file) => ({ file, name: file.name }))])
                        e.target.value = ""
                      }}
                    />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="size-4" />
                    </Button>
                    <Button onClick={() => void handleSend()} disabled={(!chatText.trim() && selectedFiles.length === 0) || sending} size="icon">
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === "info" && (
              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-sm font-medium">Название</label>
                      <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-sm font-medium">Описание</label>
                      <Textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} rows={5} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Этап</label>
                      <Select value={draftColumnId} onValueChange={setDraftColumnId}>
                        <SelectTrigger><SelectValue placeholder="Выберите этап" /></SelectTrigger>
                        <SelectContent>{columns.map((col) => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Приоритет</label>
                      <Select value={draftPriority || "_none"} onValueChange={(value) => setDraftPriority(value === "_none" ? "" : value)}>
                        <SelectTrigger><SelectValue placeholder="Без приоритета" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Без приоритета</SelectItem>
                          <SelectItem value="low">Низкий</SelectItem>
                          <SelectItem value="medium">Средний</SelectItem>
                          <SelectItem value="high">Высокий</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-sm font-medium">Дедлайн</label>
                      <Input type="datetime-local" value={draftDeadline} onChange={(e) => setDraftDeadline(e.target.value)} />
                    </div>
                  </div>
                  <Separator />

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">Виджеты</h3>
                      <Button size="sm" variant="outline" onClick={() => handleWidgetDialogOpenChange(true)}>
                        <Plus className="mr-2 size-4" />
                        Добавить виджет
                      </Button>
                    </div>
                    {widgets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Пока виджетов нет.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {widgets.map((widget) => (
                          <div key={widget.id} className="flex items-center gap-2 rounded-full border px-2 py-1">
                            <WidgetBadge widget={widget} onSave={async (widgetId, value) => !!(await onUpsertWidget({ task_id: task.id, widget_id: widgetId, type: widget.type as WidgetType, title: widget.title, value, data: widget.data }))} />
                            <Button size="icon" variant="ghost" onClick={() => void onDeleteWidget(widget.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={() => void saveInfo()}>
                      <Pencil className="mr-2 size-4" />
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => onToggleTask(task.id)}>
                      <Check className="mr-2 size-4" />
                      {task.closed_at ? "Вернуть" : "Выполнить"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="flex flex-col gap-3">
                  {(taskData?.history || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Пока нет системной истории изменений.</div>
                  ) : (
                    taskData?.history.map((entry) => renderHistoryEntry(entry))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      <Dialog open={widgetDialogOpen} onOpenChange={handleWidgetDialogOpenChange}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Добавить виджет</DialogTitle>
            <DialogDescription>Сначала выберите тип карточкой, потом заполните только нужные поля.</DialogDescription>
          </DialogHeader>

          {widgetStep === "select" ? (
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              {WIDGET_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => handleWidgetTypeSelect(option.type)}
                    className={cn(
                      "group rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                      "bg-gradient-to-br",
                      option.className
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 text-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="size-5" />
                          <p className="font-semibold">{option.title}</p>
                        </div>
                        <p className="mt-2 text-sm/5 text-white/85">{option.description}</p>
                      </div>
                      <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-white/80">
                        Выбрать
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid gap-4 py-2">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Выбранный виджет</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setWidgetStep("select")}>
                    Изменить тип
                  </Button>
                </div>

                {widgetType === "text" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Текст</label>
                    <Textarea value={widgetValue} onChange={(e) => setWidgetValue(e.target.value)} rows={4} placeholder="Введите текст" />
                  </div>
                )}

                {widgetType === "date" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Дата и время</label>
                    <Input type="datetime-local" value={widgetDate} onChange={(e) => setWidgetDate(e.target.value)} />
                  </div>
                )}

                {["link", "email", "phone", "fio"].includes(widgetType) && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      {widgetType === "link" ? "Ссылка" : widgetType === "email" ? "Почта" : widgetType === "phone" ? "Телефон" : "ФИО"}
                    </label>
                    <Input
                      value={widgetValue}
                      onChange={(e) => setWidgetValue(e.target.value)}
                      placeholder={
                        widgetType === "link"
                          ? "https://..."
                          : widgetType === "email"
                            ? "name@example.com"
                            : widgetType === "phone"
                              ? "+7 ..."
                              : "Фамилия Имя"
                      }
                    />
                  </div>
                )}

                {widgetType === "money" && (
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Сумма</label>
                      <Input value={widgetValue} onChange={(e) => setWidgetValue(e.target.value)} placeholder="10000" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Цвет рубля</label>
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                        {RUBLE_COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setWidgetColor(color)}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full border transition-transform hover:scale-105",
                              widgetColor === color && "ring-2 ring-primary ring-offset-2"
                            )}
                            style={{ backgroundColor: color }}
                            title={color}
                          >
                            {widgetColor === color ? <span className="size-2.5 rounded-full bg-white" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {widgetType === "assignee" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Ответственный</label>
                    <Select value={widgetAssignee} onValueChange={setWidgetAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите пользователя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {[member.last_name, member.first_name].filter(Boolean).join(" ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleWidgetDialogOpenChange(false)}>Отмена</Button>
            {widgetStep === "form" ? (
              <Button onClick={() => void handleWidgetSave()}>Сохранить</Button>
            ) : (
              <Button variant="ghost" onClick={() => handleWidgetDialogOpenChange(false)}>Закрыть</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
