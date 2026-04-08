import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Archive, Palette, Plus, X } from "lucide-react"
import { COLUMN_COLORS, type Task } from "@/types/task"
import type { TaskColumn } from "@/types/task"
import { KanbanCard } from "@/components/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: TaskColumn
  tasks: Task[]
  creatingTask: boolean
  onStartCreateTask: () => void
  onCancelCreateTask: () => void
  onCreateTask: (text: string) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTaskText: (id: string, text: string) => void
  onUpdateTaskDescription: (id: string, desc: string) => void
  onUpdateTaskDeadline: (id: string, deadline: string) => void
  onUpdateTaskPriority: (id: string, priority: string) => void
  onArchiveTask: (id: string) => void
  onArchiveAll: () => void
  onArchiveCompleted: () => void
  onDragStartTask: (taskId: string) => void
  onDragEndTask: () => void
  onDropTask: (columnId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onColumnDragStart?: (colId: string) => void
  onColumnDragEnd?: () => void
  columnId?: string
  listId?: string
  isDragged?: boolean
  isTaskDragOver?: boolean
  editListCol?: (listId: string, colId: string, updates: { name?: string; description?: string; color_hex?: string; is_deleted?: boolean }) => Promise<boolean>
  onColumnUpdated?: () => void
}

export function KanbanColumn({
  column,
  tasks,
  creatingTask,
  onStartCreateTask,
  onCancelCreateTask,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTaskText,
  onUpdateTaskDescription,
  onUpdateTaskDeadline,
  onUpdateTaskPriority,
  onArchiveTask,
  onArchiveAll,
  onArchiveCompleted,
  onDragStartTask,
  onDragEndTask,
  onDropTask,
  onDragOver,
  onColumnDragStart,
  onColumnDragEnd,
  columnId,
  listId,
  isDragged,
  isTaskDragOver,
  editListCol,
  onColumnUpdated,
}: KanbanColumnProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState(column.name)
  const [newTaskText, setNewTaskText] = useState("")

  const handleCreateTask = () => {
    if (newTaskText.trim()) {
      onCreateTask(newTaskText.trim())
      setNewTaskText("")
      onCancelCreateTask()
    }
  }

  return (
    <div
      data-kanban-col
      className={cn(
        "flex min-w-[280px] max-w-[320px] flex-col rounded-lg border bg-muted/30",
        isDragged && "opacity-30"
      )}
    >
      {/* Color bar */}
      <div
        className="h-1.5 w-full rounded-t-lg"
        style={{ backgroundColor: column.color }}
      />

      {/* Header - draggable */}
      <div
        className="flex cursor-grab flex-col px-3 py-2 active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          if (columnId && onColumnDragStart) {
            e.dataTransfer.setData("columnId", columnId)
            e.dataTransfer.effectAllowed = "move"
            const ghost = document.createElement("div")
            ghost.style.width = "1px"
            ghost.style.height = "1px"
            ghost.style.opacity = "0"
            document.body.appendChild(ghost)
            e.dataTransfer.setDragImage(ghost, 0, 0)
            setTimeout(() => document.body.removeChild(ghost), 0)
            onColumnDragStart(columnId)
          }
        }}
        onDragEnd={() => onColumnDragEnd?.()}
      >
        <div className="flex items-center justify-between">
          {renaming ? (
            <Input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (listId && columnId && editListCol && renameText.trim()) {
                    const ok = await editListCol(listId, columnId, { name: renameText.trim() })
                    if (ok) onColumnUpdated?.()
                  }
                  setRenaming(false)
                }
                if (e.key === "Escape") { setRenaming(false); setRenameText(column.name) }
              }}
              onBlur={async () => {
                if (listId && columnId && editListCol && renameText.trim() && renameText !== column.name) {
                  const ok = await editListCol(listId, columnId, { name: renameText.trim() })
                  if (ok) onColumnUpdated?.()
                }
                setRenaming(false)
                setRenameText(column.name)
              }}
              className="h-7 flex-1 text-sm font-medium"
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-medium">{column.name}</h3>
          )}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setRenaming(true); setRenameText(column.name) }}>
                <Pencil className="mr-2 size-4" />
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchiveAll}>
                <Archive className="mr-2 size-4" />
                Архивировать все задачи
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchiveCompleted}>
                <Archive className="mr-2 size-4" />
                Архивировать выполненные
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="mr-2 size-4" />
                  Цвет колонки
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {COLUMN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={async () => {
                          if (listId && columnId && editListCol) {
                            const ok = await editListCol(listId, columnId, { color_hex: c.value })
                            if (ok) onColumnUpdated?.()
                          }
                        }}
                        className="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {column.color === c.value && (
                          <span className="size-2 rounded-full bg-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  if (listId && columnId && editListCol) {
                    const ok = await editListCol(listId, columnId, { is_deleted: true })
                    if (ok) onColumnUpdated?.()
                  }
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {column.description && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {column.description}
          </p>
        )}
      </div>

      {/* Create task - fixed below header */}
      <div className="px-3 pb-2">
        {creatingTask ? (
          <div className="flex flex-col gap-2 rounded-md border bg-background p-3">
            <textarea
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Описание задачи..."
              className="min-h-[60px] w-full resize-none rounded border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreateTask} disabled={!newTaskText.trim()}>
                Добавить
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelCreateTask}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={onStartCreateTask}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-4" />
            Создать задачу
          </button>
        )}
      </div>

      {/* Tasks */}
      <div
        className={cn(
          "flex min-h-[100px] flex-1 flex-col gap-2 overflow-auto p-3 transition-colors",
          isTaskDragOver && "bg-primary/10"
        )}
        data-no-drag
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          onDragOver(e)
        }}
        onDragLeave={() => {}}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const taskId = e.dataTransfer.getData("taskId")
          if (taskId) {
            onDropTask(column.id)
          }
        }}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            id={task.id}
            title={task.title}
            description={task.description}
            deadline_date={task.deadline_date}
            closed_at={task.closed_at}
            priority={task.priority}
            order={task.order}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            onUpdateText={onUpdateTaskText}
            onUpdateDescription={onUpdateTaskDescription}
            onUpdateDeadline={onUpdateTaskDeadline}
            onUpdatePriority={onUpdateTaskPriority}
            onArchive={onArchiveTask}
            onDragStart={onDragStartTask}
            onDragEnd={onDragEndTask}
          />
        ))}
      </div>
    </div>
  )
}
