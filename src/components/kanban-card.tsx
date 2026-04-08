import { useState, useRef } from "react"
import {
  Check,
  Trash2,
  Pencil,
  Calendar,
  MoreHorizontal,
  Archive,
  AlertTriangle,
} from "lucide-react"
import { PRIORITY_COLORS } from "@/types/task"
import { cn } from "@/lib/utils"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface KanbanCardProps {
  id: string
  title: string
  description: string | null
  deadline_date: string | null
  closed_at: string | null
  priority: string
  order: number
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdateText: (id: string, text: string) => void
  onUpdateDescription: (id: string, desc: string) => void
  onUpdateDeadline: (id: string, deadline: string) => void
  onUpdatePriority: (id: string, priority: string) => void
  onArchive: (id: string) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
}

export function KanbanCard({
  id,
  title,
  description,
  deadline_date,
  closed_at,
  priority,
  onToggle,
  onDelete,
  onUpdateText,
  onUpdateDescription,
  onUpdateDeadline,
  onUpdatePriority,
  onArchive,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descText, setDescText] = useState(description || "")
  const inputRef = useRef<HTMLInputElement>(null)

  const isCompleted = closed_at !== null

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

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart(id)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative rounded-md border bg-background p-3 shadow-sm transition-all",
        "cursor-grab active:cursor-grabbing",
        "hover:shadow-md",
        isCompleted && "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-950/20"
      )}
    >
      {/* Three-dot menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
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
            <DropdownMenuItem onClick={() => {
              const val = prompt("Укажите дедлайн (YYYY-MM-DD):", deadline_date ? deadline_date.slice(0, 10) : "")
              if (val !== null) onUpdateDeadline(id, val || "")
            }}>
              <Calendar className="mr-2 size-4" />
              Указать дедлайн
            </DropdownMenuItem>
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
                  Без приоритета
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
          onClick={() => onToggle(id)}
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

          <div className="flex items-center gap-2">
            {priority && (
              <span className={cn("text-xs font-medium", PRIORITY_COLORS[priority] || "text-muted-foreground")}>
                {priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Средний"}
              </span>
            )}
            {deadline_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {new Date(deadline_date).toLocaleDateString("ru-RU")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
