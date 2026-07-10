import { useState, useEffect } from "react"
import { MoreHorizontal, Pencil, Trash2, Archive, Plus, X } from "lucide-react"
import { COLUMN_COLORS, type Task } from "@/types/task"
import type { TaskColumn } from "@/types/task"
import { KanbanCard } from "@/components/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  onUpdateTaskText: (id: string, text: string) => void
  onUpdateTaskDescription: (id: string, desc: string) => void
  onUpdateTaskDeadline: (id: string, deadline: string) => void
  onUpdateTaskPriority: (id: string, priority: string) => void
  onArchiveTask: (id: string) => void
  onArchiveAll: (onProgress?: (done: number, total: number) => void) => Promise<void>
  onArchiveCompleted: (onProgress?: (done: number, total: number) => void) => Promise<void>
  onDeleteAllTasks: (onProgress?: (done: number, total: number) => void) => Promise<void>
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
  selectedTaskId: string | null
  onSelectTask: (id: string | null) => void
  onOpenTask: (id: string) => void
  onConfirmTaskAction: (id: string) => void
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
  onUpdateTaskText,
  onUpdateTaskDescription,
  onUpdateTaskDeadline,
  onUpdateTaskPriority,
  onArchiveTask,
  onArchiveAll,
  onArchiveCompleted,
  onDeleteAllTasks,
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
  selectedTaskId,
  onSelectTask,
  onOpenTask,
  onConfirmTaskAction,
  editListCol,
  onColumnUpdated,
}: KanbanColumnProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState(column.name)
  const [newTaskText, setNewTaskText] = useState("")

  // Mass action dialog states
  const [massAction, setMassAction] = useState<"archiveAll" | "archiveCompleted" | "deleteAll" | "deleteColumn" | null>(null)
  const [massActionProgress, setMassActionProgress] = useState(0)
  const [massActionTotal, setMassActionTotal] = useState(0)
  const [deleteColumnStep, setDeleteColumnStep] = useState<"tasks" | "column" | null>(null)

  // Close dialog when progress reaches total
  useEffect(() => {
    if (massAction !== null && massActionTotal > 0 && massActionProgress >= massActionTotal) {
      const timer = setTimeout(() => {
        if (massAction === "deleteColumn") {
          // After tasks are deleted, proceed to column deletion
          setDeleteColumnStep("column")
          setMassActionProgress(0)
          setMassActionTotal(0)
        } else {
          setMassAction(null)
          setMassActionProgress(0)
          setMassActionTotal(0)
        }
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [massActionProgress, massActionTotal, massAction])

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
        "max-h-[calc(100vh-14rem)]",
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
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={() => { setRenaming(true); setRenameText(column.name) }}>
                <Pencil className="mr-2 size-4" />
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Цвет колонки</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {COLUMN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={async () => {
                        if (listId && columnId && editListCol) {
                          const ok = await editListCol(listId, columnId, { color_hex: c.value })
                          if (ok) onColumnUpdated?.()
                        }
                      }}
                      className="flex size-6 items-center justify-center rounded-full transition-transform hover:scale-125"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {column.color === c.value && (
                        <span className="size-2 rounded-full bg-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMassAction("archiveAll")}>
                <Archive className="mr-2 size-4" />
                Архивировать все задачи
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMassAction("archiveCompleted")}>
                <Archive className="mr-2 size-4" />
                Архивировать выполненные
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMassAction("deleteAll")}>
                <Trash2 className="mr-2 size-4" />
                Удалить все задачи
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setMassAction("deleteColumn")
                  setDeleteColumnStep("tasks")
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Удалить колонку
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && newTaskText.trim()) {
                  e.preventDefault()
                  handleCreateTask()
                }
              }}
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
          "flex flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors",
          "min-h-0",
          isTaskDragOver && "bg-primary/10"
        )}
        data-no-drag
        onClick={(e) => {
          // Deselect when clicking on empty area (not on a card or button)
          const target = e.target as HTMLElement
          if (!target.closest("[data-kanban-card]") && !target.closest("button") && !target.closest("[role='menuitem']")) {
            onSelectTask(null)
          }
        }}
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
            widgets={task.widgets}
            isSelected={selectedTaskId === task.id}
            onSelect={(id) => onSelectTask(selectedTaskId === id ? null : id)}
            onToggle={onToggleTask}
            onDelete={() => onConfirmTaskAction(task.id)}
            onArchive={onArchiveTask}
            onUpdateText={onUpdateTaskText}
            onUpdateDescription={onUpdateTaskDescription}
            onUpdateDeadline={onUpdateTaskDeadline}
            onUpdatePriority={onUpdateTaskPriority}
            onDragStart={onDragStartTask}
            onDragEnd={onDragEndTask}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      {/* Mass action confirmation dialogs */}
      {massAction && (
        <Dialog open={massAction !== null} onOpenChange={(open) => { if (!open) { setMassAction(null); setMassActionProgress(0); setMassActionTotal(0); setDeleteColumnStep(null) } }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {massAction === "archiveAll" && "Архивировать все задачи?"}
                {massAction === "archiveCompleted" && "Архивировать выполненные?"}
                {massAction === "deleteAll" && "Удалить все задачи?"}
                {massAction === "deleteColumn" && deleteColumnStep === "tasks" && "Удалить все задачи колонки?"}
                {massAction === "deleteColumn" && deleteColumnStep === "column" && "Удалить колонку?"}
              </DialogTitle>
              <DialogDescription>
                {massAction === "archiveAll" && `Будет архивировано ${tasks.length} задач`}
                {massAction === "archiveCompleted" && `Будет архивировано ${tasks.filter((t) => t.closed_at).length} выполненных задач`}
                {massAction === "deleteAll" && `Будет удалено ${tasks.length} задач`}
                {massAction === "deleteColumn" && deleteColumnStep === "tasks" && `Сначала нужно удалить ${tasks.length} задач в колонке`}
                {massAction === "deleteColumn" && deleteColumnStep === "column" && `Колонка «${column.name}» будет удалена безвозвратно`}
              </DialogDescription>
            </DialogHeader>
            {massActionProgress > 0 && (
              <div className="space-y-2">
                <Progress value={(massActionProgress / massActionTotal) * 100} className="h-2" />
                <p className="text-center text-sm text-muted-foreground">
                  Обработано {massActionProgress} из {massActionTotal}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMassAction(null); setMassActionProgress(0); setMassActionTotal(0); setDeleteColumnStep(null) }}>
                Отмена
              </Button>
              {massAction === "deleteColumn" && deleteColumnStep === "column" ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (listId && columnId && editListCol) {
                      const ok = await editListCol(listId, columnId, { is_deleted: true })
                      if (ok) {
                        setMassAction(null)
                        setMassActionProgress(0)
                        setMassActionTotal(0)
                        setDeleteColumnStep(null)
                        onColumnUpdated?.()
                      }
                    }
                  }}
                >
                  Удалить колонку
                </Button>
              ) : (
                <Button
                  variant={massAction === "deleteAll" || massAction === "deleteColumn" ? "destructive" : "default"}
                  disabled={massActionProgress > 0 && massActionProgress < massActionTotal}
                  onClick={() => {
                    if (!listId || !columnId) return
                    setMassActionTotal(tasks.length)
                    setMassActionProgress(0)
                    if (massAction === "deleteAll" || massAction === "deleteColumn") {
                      onDeleteAllTasks((done, total) => {
                        setMassActionProgress(done)
                        setMassActionTotal(total)
                      })
                    } else if (massAction === "archiveAll") {
                      onArchiveAll((done, total) => {
                        setMassActionProgress(done)
                        setMassActionTotal(total)
                      })
                    } else if (massAction === "archiveCompleted") {
                      onArchiveCompleted((done, total) => {
                        setMassActionProgress(done)
                        setMassActionTotal(total)
                      })
                    }
                  }}
                >
                  {massAction === "archiveAll" && "Архивировать все"}
                  {massAction === "archiveCompleted" && "Архивировать выполненные"}
                  {(massAction === "deleteAll" || massAction === "deleteColumn") && deleteColumnStep === "tasks" && "Удалить все задачи"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
