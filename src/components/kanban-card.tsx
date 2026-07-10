import { useState, useRef } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Check,
  Trash2,
  Pencil,
  MoreHorizontal,
  Archive,
  AlertTriangle,
  CalendarIcon,
  Plus,
  Link2,
  Mail,
  Phone,
  DollarSign,
  User,
} from "lucide-react"
import { PRIORITY_COLORS } from "@/types/task"
import { cn } from "@/lib/utils"
import type { TaskWidget } from "@/types/task"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TeamMember = { id: string; first_name: string; last_name: string; img_url: string | null }

interface KanbanCardProps {
  id: string
  title: string
  description: string | null
  deadline_date: string | null
  closed_at: string | null
  priority: string
  order: number
  widgets?: TaskWidget[]
  isSelected: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUpdateText: (id: string, text: string) => void
  onUpdateDescription: (id: string, desc: string) => void
  onUpdateDeadline: (id: string, deadline: string) => void
  onUpdatePriority: (id: string, priority: string) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  onOpenTask: (id: string) => void
  onAddWidget: (id: string) => void
  teamMembers?: TeamMember[]
}

export function KanbanCard({
  id,
  title,
  description,
  deadline_date,
  closed_at,
  priority,
  isSelected,
  widgets = [],
  onSelect,
  onToggle,
  onDelete,
  onArchive,
  onUpdateText,
  onUpdateDescription,
  onUpdateDeadline,
  onUpdatePriority,
  onDragStart,
  onDragEnd,
  onOpenTask,
  onAddWidget,
  teamMembers = [],
}: KanbanCardProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descText, setDescText] = useState(description || "")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isCompleted = closed_at !== null
  const parsedDate = deadline_date ? new Date(deadline_date) : undefined
  const isOverdue = parsedDate ? parsedDate < new Date() : false

  const handleSave = () => {
    if (editText.trim()) {
      onUpdateText(id, editText.trim())
    } else {
      setEditText(title)
    }
    setEditing(false)
  }

  const handleSaveDesc = () => {
    onUpdateDescription(id, descText.trim())
    setEditingDesc(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const hours = parsedDate ? parsedDate.getHours() : 12
    const minutes = parsedDate ? parsedDate.getMinutes() : 0
    const seconds = parsedDate ? parsedDate.getSeconds() : 0
    date.setHours(hours, minutes, seconds)
    onUpdateDeadline(id, date.toISOString())
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value
    if (!timeStr || !parsedDate) return
    const [hours, minutes, seconds] = timeStr.split(":").map(Number)
    const newDate = new Date(parsedDate)
    newDate.setHours(hours || 0, minutes || 0, seconds || 0)
    onUpdateDeadline(id, newDate.toISOString())
  }

  const timeValue = parsedDate
    ? `${String(parsedDate.getHours()).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`
    : "12:00"

  const getWidgetMeta = (widget: TaskWidget) => {
    const iconClass = "size-3.5 shrink-0"
    const moneyColor =
      typeof widget.data?.color === "string"
        ? String(widget.data.color)
        : typeof widget.data?.ruble_color === "string"
          ? String(widget.data.ruble_color)
          : undefined
    const member = widget.type === "assignee" ? teamMembers.find((item) => item.id === widget.value) : null
    const memberName = member ? [member.last_name, member.first_name].filter(Boolean).join(" ") : ""
    const memberInitials = member
      ? [member.first_name, member.last_name]
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase())
          .join("")
      : ""

    const icon = {
      date: <CalendarIcon className={iconClass} />,
      text: <Pencil className={iconClass} />,
      link: <Link2 className={iconClass} />,
      email: <Mail className={iconClass} />,
      phone: <Phone className={iconClass} />,
      fio: <User className={iconClass} />,
      money: <DollarSign className={iconClass} style={moneyColor ? { color: moneyColor } : undefined} />,
      assignee: member ? (
        <span className="flex size-4 overflow-hidden rounded-full bg-muted">
          {member.img_url ? <img src={member.img_url} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-[10px] font-semibold">{memberInitials || "?"}</span>}
        </span>
      ) : (
        <User className={iconClass} />
      ),
    }[widget.type]

    const label =
      widget.type === "assignee"
        ? memberName || "Ответственный"
        : widget.value || "—"

    return { icon, label }
  }

  return (
    <>
      <div
        draggable={!editing && !editingDesc}
        onDragStart={(e) => {
          e.dataTransfer.setData("taskId", id)
          e.dataTransfer.effectAllowed = "move"
          onDragStart(id)
        }}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          e.stopPropagation()
          if (!editing && !editingDesc) {
            onSelect(id)
            onOpenTask(id)
          }
        }}
        className={cn(
          "group relative rounded-md border bg-background p-3 shadow-sm transition-all duration-300",
          "animate-in fade-in-0 zoom-in-95",
          !editing && "cursor-grab active:cursor-grabbing",
          "hover:shadow-md",
          isSelected && "border-dashed border-2 border-primary",
          isCompleted && "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-950/20"
        )}
      >
      {/* Three-dot menu */}
      <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddWidget(id) }}>
              <Plus className="mr-2 size-4" />
              Добавить виджет
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggle(id)}>
              <Check className="mr-2 size-4" />
              {isCompleted ? "Отметить невыполненной" : "Отметить выполненной"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="mr-2 size-4" />
              Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingDesc(true)}>
              <Pencil className="mr-2 size-4" />
              Изменить описание
            </DropdownMenuItem>

            {/* Deadline submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CalendarIcon className="mr-2 size-4" />
                Дедлайн
                {deadline_date && (
                  <span className={cn("ml-auto text-xs", isOverdue && "text-red-500")}>
                    {format(parsedDate!, "dd.MM.yy")}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-0 w-[240px]">
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={(date) => {
                    handleDateSelect(date)
                  }}
                  defaultMonth={parsedDate}
                  locale={ru}
                  className="w-full"
                />
                <div className="border-t px-3 py-2">
                  <Input
                    type="time"
                    step="60"
                    value={timeValue}
                    onChange={handleTimeChange}
                    className="h-8 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
                {deadline_date && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                      onClick={() => onUpdateDeadline(id, "")}
                    >
                      Убрать дедлайн
                    </Button>
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Priority submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlertTriangle className="mr-2 size-4" />
                Приоритет
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onUpdatePriority(id, "low")}>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-blue-500" />
                    Низкий
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdatePriority(id, "medium")}>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-yellow-500" />
                    Средний
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdatePriority(id, "high")}>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-red-500" />
                    Высокий
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdatePriority(id, "")}>
                  Без приорета
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(id)}>
              <Archive className="mr-2 size-4" />
              Архивировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(id)}>
              <Trash2 className="mr-2 size-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(id)
          }}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
            isCompleted
              ? "border-green-500 bg-green-500 text-white"
              : "border-input hover:border-ring"
          )}
        >
          {isCompleted && <Check className="size-3" />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {editing ? (
            <Input
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") { setEditText(title); setEditing(false) }
              }}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-medium"
              onDoubleClick={() => { setEditing(true); setEditText(title) }}
            >
              {title}
            </span>
          )}

          {editingDesc ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={descText}
                onChange={(e) => setDescText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveDesc()
                  }
                }}
                placeholder="Описание задачи..."
                className="min-h-[60px] text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDesc}>
                  Сохранить
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingDesc(false); setDescText(description || "") }}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}

          {/* Meta info: priority and deadline */}
          <div className="flex items-center gap-2">
            {priority && (
              <span className={cn("text-xs font-medium", PRIORITY_COLORS[priority] || "text-muted-foreground")}>
                {priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Средний"}
              </span>
            )}
            {deadline_date && (
              <span className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-500" : "text-muted-foreground"
              )}>
                <CalendarIcon className="size-3" />
                {format(parsedDate!, "dd.MM.yy")}
              </span>
            )}
          </div>
          {widgets.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {widgets.slice(0, 3).map((widget) => (
                <span key={widget.id} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {(() => {
                    const meta = getWidgetMeta(widget)
                    return (
                      <>
                        <span className="inline-flex size-4 items-center justify-center rounded-full bg-background/80">
                          {meta.icon}
                        </span>
                        <span className="max-w-[120px] truncate">{meta.label}</span>
                      </>
                    )
                  })()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Confirmation dialog for delete/archive */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Что сделать с задачей?</DialogTitle>
            <DialogDescription>
              Выберите действие для задачи «{title}»
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onArchive(id)
                  setConfirmOpen(false)
                }}
              >
                <Archive className="mr-2 size-4" />
                Архивировать
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDelete(id)
                  setConfirmOpen(false)
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Удалить
              </Button>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground text-center">
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd> или <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Backspace</kbd> — удалить задачу</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>+<kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd> — в архив</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd> — закрыть</span>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
