import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Archive, Check, Clock3, MessageSquare, Pencil, Send, Trash2, History, ListTodo } from "lucide-react"
import type { TaskColumn } from "@/types/task"
import type { TaskCardData, TaskChatMessage, TaskActivityLog } from "@/hooks/use-task-lists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type TaskTab = "chat" | "info" | "history"

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
  onSendMessage: (taskId: string, content: string) => Promise<TaskChatMessage | null>
}

function formatTaskDate(value: string | null | undefined): string {
  if (!value) return "Не задано"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Не задано"
  return format(parsed, "d MMM yyyy, HH:mm", { locale: ru })
}

function renderHistoryEntry(entry: TaskActivityLog) {
  return (
    <div key={entry.id} className="rounded-xl border bg-background/60 p-3">
      <p className="text-sm font-medium">{entry.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatTaskDate(entry.created_at)}
      </p>
    </div>
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
  onArchiveTask,
  onDeleteTask,
  onSendMessage,
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
    }
  }, [open])

  const currentColumnName = useMemo(() => columns.find((col) => col.id === draftColumnId)?.name || "Без этапа", [columns, draftColumnId])

  const handleSend = async () => {
    if (!task || !chatText.trim()) return
    setSending(true)
    try {
      const sent = await onSendMessage(task.id, chatText.trim())
      if (sent) {
        setChatText("")
      }
    } finally {
      setSending(false)
    }
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

  const saveInfo = async () => {
    if (draftTitle.trim()) {
      await onUpdateText(task.id, draftTitle.trim())
    }
    await onUpdateDescription(task.id, draftDescription.trim())
    await onUpdatePriority(task.id, draftPriority)
    if (draftColumnId && draftColumnId !== task.column_id) {
      await onUpdateColumn(task.id, draftColumnId)
    }
    if (draftDeadline) {
      await onUpdateDeadline(task.id, new Date(draftDeadline).toISOString())
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl p-0">
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
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onToggleTask(task.id)}>
                <Check className="mr-2 size-4" />
                {task.closed_at ? "Вернуть" : "Выполнить"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onArchiveTask(task.id)}>
                <Archive className="mr-2 size-4" />
                В архив
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDeleteTask(task.id)}>
                <Trash2 className="mr-2 size-4" />
                Удалить
              </Button>
            </div>
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
                      taskData?.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[85%] rounded-2xl border px-4 py-3",
                            message.role === "user" ? "ml-auto bg-primary/5" : "bg-background"
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatTaskDate(message.created_at)}
                          </p>
                        </div>
                    ))
                  )}
                  </div>
                </div>
                <div className="border-t p-4">
                  <div className="flex gap-2">
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
                    <Button onClick={() => void handleSend()} disabled={!chatText.trim() || sending}>
                      <Send className="mr-2 size-4" />
                      Отправить
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
                      <Textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} rows={6} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Этап</label>
                      <Select value={draftColumnId} onValueChange={setDraftColumnId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите этап" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Приоритет</label>
                      <Select value={draftPriority || "_none"} onValueChange={(value) => setDraftPriority(value === "_none" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Без приоритета" />
                        </SelectTrigger>
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
                  <Button onClick={() => void saveInfo()}>
                    <Pencil className="mr-2 size-4" />
                    Сохранить изменения
                  </Button>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="flex flex-col gap-3">
                  {(taskData?.history || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Пока нет системной истории изменений.
                    </div>
                  ) : (
                    taskData?.history.map((entry) => renderHistoryEntry(entry))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
