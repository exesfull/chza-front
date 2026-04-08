import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { ChevronRight, Plus, LayoutGrid, Loader2 } from "lucide-react"
import { useTaskLists } from "@/hooks/use-task-lists"
import type { TaskColumn } from "@/types/task"
import { COLUMN_COLORS } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanColumn } from "@/components/kanban-column"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const TEMPLATE_COLS = [
  { name: "Обсуждение", color: COLUMN_COLORS[5].value },
  { name: "Ожидание", color: COLUMN_COLORS[4].value },
  { name: "В работе", color: COLUMN_COLORS[1].value },
  { name: "Готово", color: COLUMN_COLORS[2].value },
]

export function TaskBoardPage() {
  const { teamLogin, listId } = useParams()
  const {
    getListInfo,
    updateListColsSort,
    editListCol,
    createListCol,
    fetchTasks,
    getTasksForColumn,
    archiveAllInColumn,
    createTask,
    toggleTask,
    updateTaskText,
    updateTaskDescription,
    updateTaskDeadline,
    updateTaskPriority,
    archiveTask,
    moveTask,
  } = useTaskLists(teamLogin)

  const [listInfo, setListInfo] = useState<{ id: string; name: string; description: string; view_type: string } | null>(null)
  const [columns, setColumns] = useState<TaskColumn[]>([])
  const [loading, setLoading] = useState(true)

  const [creatingColumn, setCreatingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [taskDragOverColId, setTaskDragOverColId] = useState<string | null>(null)

  // Template creation state
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [templateProgress, setTemplateProgress] = useState(0)

  // Column drag state - keep all columns rendered, just highlight
  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch list info on mount / listId change
  useEffect(() => {
    if (!listId) return
    setLoading(true)
    getListInfo(listId).then(async (info) => {
      if (info) {
        setListInfo(info.list)
        setColumns(info.cols)
        // Fetch tasks after getting list info
        await fetchTasks(listId)
      }
      setLoading(false)
    })
  }, [listId, getListInfo, fetchTasks])

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !listId) return
    const col = await createListCol(listId, newColumnName.trim())
    if (col) {
      getListInfo(listId).then((info) => {
        if (info) setColumns(info.cols)
      })
      setCreatingColumn(false)
      setNewColumnName("")
    }
  }

  const handleCreateTemplate = async () => {
    if (!listId) return
    setCreatingTemplate(true)
    setTemplateProgress(0)
    for (let i = 0; i < TEMPLATE_COLS.length; i++) {
      const col = TEMPLATE_COLS[i]
      await createListCol(listId, col.name, col.color)
      setTemplateProgress(((i + 1) / TEMPLATE_COLS.length) * 100)
    }
    // Refresh columns
    getListInfo(listId).then((info) => {
      if (info) setColumns(info.cols)
    })
    setCreatingTemplate(false)
    setTemplateProgress(0)
  }

  // Determine insert position based on mouse X
  const getInsertAfterIndex = useCallback((clientX: number): number => {
    if (!containerRef.current) return -1
    const colEls = containerRef.current.querySelectorAll("[data-col-id]")
    for (let i = 0; i < colEls.length; i++) {
      const rect = colEls[i].getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      if (clientX < midX) return i - 1
    }
    return colEls.length - 1
  }, [])

  const handleColumnDragStart = useCallback((colId: string) => {
    setDraggedColId(colId)
  }, [])

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColId(null)
    setInsertAfterIdx(null)
  }, [])

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    // Only handle if this is a column drag (check dataTransfer types)
    if (!draggedColId) return
    e.preventDefault()
    const idx = getInsertAfterIndex(e.clientX)
    setInsertAfterIdx(idx)
  }, [draggedColId, getInsertAfterIndex])

  const handleColumnDrop = useCallback(async () => {
    if (!draggedColId || insertAfterIdx === null || !listId) {
      setDraggedColId(null)
      setInsertAfterIdx(null)
      return
    }

    const dragIdx = columns.findIndex((c) => c.id === draggedColId)
    if (dragIdx === -1) {
      setDraggedColId(null)
      setInsertAfterIdx(null)
      return
    }

    const targetIdx = insertAfterIdx + 1
    if (dragIdx === targetIdx || dragIdx === targetIdx - 1) {
      setDraggedColId(null)
      setInsertAfterIdx(null)
      return
    }

    const newOrder = [...columns]
    const [dragged] = newOrder.splice(dragIdx, 1)
    // Recalculate target index after removal
    const newTargetIdx = dragIdx < insertAfterIdx + 1 ? insertAfterIdx : insertAfterIdx + 1
    newOrder.splice(newTargetIdx, 0, dragged)

    setColumns(newOrder)
    const newIds = newOrder.map((c) => c.id)
    const ok = await updateListColsSort(listId, newIds)
    if (!ok) {
      getListInfo(listId).then((info) => {
        if (info) setColumns(info.cols)
      })
    }

    setDraggedColId(null)
    setInsertAfterIdx(null)
  }, [draggedColId, insertAfterIdx, columns, listId, updateListColsSort, getListInfo])

  // Task drag-and-drop
  const handleTaskDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId)
  }, [])

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTaskId(null)
    setTaskDragOverColId(null)
  }, [])

  const handleTaskDragOver = useCallback((columnId: string) => {
    setTaskDragOverColId(columnId)
  }, [])

  const handleTaskDrop = useCallback(async (columnId: string) => {
    if (draggedTaskId && listId) {
      const ok = await moveTask(listId, draggedTaskId, columnId)
      if (ok) {
        // Refresh tasks from API to get the updated state
        await fetchTasks(listId)
      }
      setDraggedTaskId(null)
      setTaskDragOverColId(null)
    }
  }, [draggedTaskId, listId, moveTask, fetchTasks])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[280px] max-w-[320px] flex-shrink-0 flex flex-col gap-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Breadcrumbs */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2 lg:px-6">
        <Link to={`/teams/${teamLogin}/tasks`} className="text-sm text-muted-foreground hover:text-foreground">
          Задачи
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        {listInfo ? (
          <span className="text-sm font-medium">{listInfo.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        )}
      </div>

      {/* Board header with Add column button */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 lg:px-6">
        <h1 className="text-xl font-bold">{listInfo?.name || "Загрузка..."}</h1>
        {!creatingColumn ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraggedColId(null)
              setInsertAfterIdx(null)
              setCreatingColumn(true)
            }}
          >
            <Plus className="mr-1 size-4" />
            Добавить колонку
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Название колонки"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              Создать
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setCreatingColumn(false); setNewColumnName("") }}>
              Отмена
            </Button>
          </div>
        )}
      </div>

      {/* Kanban board - scrollable area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-6"
        style={{ minHeight: 0 }}
        onDragOver={handleColumnDragOver}
        onDrop={handleColumnDrop}
      >
        {columns.length === 0 && !creatingTemplate ? (
          /* Empty state */
          <div className="flex h-full items-center justify-center">
            <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-lg border bg-muted/30 p-8 text-center">
              <LayoutGrid className="size-12 text-muted-foreground opacity-50" />
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Колонок ещё нет</h3>
                <p className="text-sm text-muted-foreground">
                  Вы можете добавить колонку, нажав «Добавить колонку», или мы создадим для вас шаблон из 4 колонок: Обсуждение, Ожидание, В работе, Готово.
                </p>
              </div>
              <Button onClick={handleCreateTemplate} disabled={creatingTemplate}>
                {creatingTemplate ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Создать из шаблона
                  </>
                )}
              </Button>
              {creatingTemplate && (
                <div className="w-full">
                  <Progress value={templateProgress} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Создание колонок: {Math.round(templateProgress)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : creatingTemplate ? (
          /* Creating template - show progress */
          <div className="flex h-full items-center justify-center">
            <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border bg-muted/30 p-8 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Создаём шаблон...</h3>
              <Progress value={templateProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Создание колонок: {Math.round(templateProgress)}%
              </p>
            </div>
          </div>
        ) : (
          /* Columns */
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {columns.map((column, idx) => {
            const isDragged = column.id === draggedColId

            // Show insert line AFTER this column
            const showInsertLine = draggedColId !== null && insertAfterIdx === idx

            return (
              <div key={column.id} className="flex items-start">
                {/* Column */}
                <div
                  data-col-id={column.id}
                  className={cn(
                    "flex min-w-[280px] max-w-[320px] flex-col rounded-lg border bg-muted/30",
                    isDragged && "opacity-30"
                  )}
                >
                  <KanbanColumn
                    column={column}
                    tasks={getTasksForColumn(column.id)}
                    creatingTask={creatingTaskColumnId === column.id}
                    onStartCreateTask={() => setCreatingTaskColumnId(column.id)}
                    onCancelCreateTask={() => setCreatingTaskColumnId(null)}
                    onCreateTask={(text) => {
                      if (listId) createTask(listId, column.id, text)
                    }}
                    onToggleTask={(taskId) => {
                      const task = getTasksForColumn(column.id).find((t) => t.id === taskId)
                      if (task && listId) {
                        toggleTask(listId, taskId, !!task.closed_at)
                      }
                    }}
                    onDeleteTask={() => {}}
                    onUpdateTaskText={(taskId, text) => {
                      if (listId) updateTaskText(listId, taskId, text)
                    }}
                    onUpdateTaskDescription={(taskId, desc) => {
                      if (listId) updateTaskDescription(listId, taskId, desc)
                    }}
                    onUpdateTaskDeadline={(taskId, deadline) => {
                      if (listId) updateTaskDeadline(listId, taskId, deadline)
                    }}
                    onUpdateTaskPriority={(taskId, priority) => {
                      if (listId) updateTaskPriority(listId, taskId, priority)
                    }}
                    onArchiveTask={(taskId) => {
                      if (listId) archiveTask(listId, taskId)
                    }}
                    onArchiveAll={() => archiveAllInColumn(column.id)}
                    onArchiveCompleted={() => {
                      const tasksInCol = getTasksForColumn(column.id)
                      tasksInCol.forEach((t) => {
                        if (!t.closed_at && listId) {
                          toggleTask(listId, t.id, false)
                        }
                      })
                    }}
                    onDragStartTask={handleTaskDragStart}
                    onDragEndTask={handleTaskDragEnd}
                    onDropTask={handleTaskDrop}
                    onDragOver={() => {}}
                    onColumnDragStart={handleColumnDragStart}
                    onColumnDragEnd={handleColumnDragEnd}
                    columnId={column.id}
                    listId={listId}
                    isDragged={isDragged}
                    editListCol={editListCol}
                    onColumnUpdated={() => {
                      if (listId) {
                        getListInfo(listId).then((info) => {
                          if (info) setColumns(info.cols)
                        })
                      }
                    }}
                  />
                </div>

                {/* Insert line indicator */}
                {showInsertLine && (
                  <div
                    className="w-1 self-stretch rounded-full bg-primary"
                    style={{ minHeight: 100, margin: "0 8px" }}
                  />
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
