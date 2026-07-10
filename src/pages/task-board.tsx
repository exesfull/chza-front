import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom"
import { ChevronRight, Plus, LayoutGrid, Loader2, Archive, Trash2, Settings, Pencil, ListTodo, Table } from "lucide-react"
import { useTaskLists } from "@/hooks/use-task-lists"
import { useProjects } from "@/hooks/use-projects"
import { useTeamMembers } from "@/hooks/use-team-members"
import { api } from "@/lib/api"
import type { TaskColumn } from "@/types/task"
import { COLUMN_COLORS } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { KanbanColumn } from "@/components/kanban-column"
import { TableView } from "@/components/table-view"
import { TaskDetailSheet, TaskWidgetDialog } from "@/components/task-detail-sheet"
import { Skeleton } from "@/components/ui/skeleton"
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { TaskCardData } from "@/hooks/use-task-lists"

const TEMPLATE_COLS = [
  { name: "Обсуждение", color: COLUMN_COLORS[5].value },
  { name: "Ожидание", color: COLUMN_COLORS[4].value },
  { name: "В работе", color: COLUMN_COLORS[1].value },
  { name: "Готово", color: COLUMN_COLORS[2].value },
]

export function TaskBoardPage() {
  const navigate = useNavigate()
  const { teamLogin, listId, projectId: routeProjectId } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = routeProjectId ?? searchParams.get("project_id")
  const { getProject } = useProjects(teamLogin, { autoLoad: false })
  const { members: teamMembers } = useTeamMembers(teamLogin)
  const {
    getListInfo,
    updateListColsSort,
    editListCol,
    editList,
    createListCol,
    fetchTasks,
    getTasksForColumn,
    tasks,
    createTask,
    toggleTask,
    updateTaskText,
    updateTaskDescription,
    updateTaskDeadline,
    updateTaskPriority,
    archiveTask,
    deleteTask,
    moveTask,
    deleteAllTasksInColumn,
    archiveAllTasksInColumn,
    getTaskCard,
    sendTaskMessage,
    editTaskMessage,
    editTaskAttachment,
    deleteTaskMessage,
    deleteTaskAttachment,
    upsertTaskWidget,
    deleteTaskWidget,
  } = useTaskLists(teamLogin, projectId)

  const [listInfo, setListInfo] = useState<{ id: string; name: string; description: string; view_type: string } | null>(null)
  const [columns, setColumns] = useState<TaskColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState("")

  const [creatingColumn, setCreatingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [taskDragOverColId, setTaskDragOverColId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [taskSheetLoading, setTaskSheetLoading] = useState(false)
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false)
  const [widgetDialogTaskId, setWidgetDialogTaskId] = useState<string | null>(null)
  const [taskSheetInitialTab, setTaskSheetInitialTab] = useState<"chat" | "info" | "history">("chat")
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeTaskData, setActiveTaskData] = useState<TaskCardData | null>(null)
  const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pollInterval, setPollInterval] = useState(3000)
  const [consecutiveMatches, setConsecutiveMatches] = useState(0)

  // List settings
  const [renamingList, setRenamingList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [stagesOpen, setStagesOpen] = useState(false)

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
        setListUpdatedAt(info.list.updated_at)
        setConsecutiveMatches(0)
        setPollInterval(3000)
        // Set page title
        document.title = info.list.name
        // Fetch tasks after getting list info
        await fetchTasks(listId)
      }
      setLoading(false)
    })
  }, [listId, getListInfo, fetchTasks])

  useEffect(() => {
    let cancelled = false

    if (!projectId) {
      setProjectName("")
      return
    }

    getProject(projectId).then((project) => {
      if (!cancelled) {
        setProjectName(project?.name || "")
      }
    })

    return () => {
      cancelled = true
    }
  }, [projectId, getProject])

  // Update title when listInfo changes
  useEffect(() => {
    if (listInfo?.name) {
      document.title = listInfo.name
    }
  }, [listInfo?.name])

  // Polling for list updates
  useEffect(() => {
    if (!listId || !listUpdatedAt || isUpdating) return
    const timer = setInterval(async () => {
      try {
        const projectQuery = projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
        const { data } = await api.get(`/main/task/getUpdatedTimeOnList/?team_login=${teamLogin}&list_id=${listId}${projectQuery}`)
        if (data.status && data.data?.updated_at) {
          if (data.data.updated_at !== listUpdatedAt) {
            // List has been updated - refresh everything
            setConsecutiveMatches(0)
            setPollInterval(3000)
            setIsUpdating(true)
            const info = await getListInfo(listId)
            if (info) {
              setListInfo(info.list)
              setColumns(info.cols)
              setListUpdatedAt(info.list.updated_at)
              await fetchTasks(listId)
            }
            setIsUpdating(false)
          } else {
            // No changes
            const newCount = consecutiveMatches + 1
            if (newCount >= 3) {
              setPollInterval(5000)
            }
            setConsecutiveMatches(newCount)
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, pollInterval)
    return () => clearInterval(timer)
  }, [listId, listUpdatedAt, pollInterval, consecutiveMatches, isUpdating, teamLogin, projectId, getListInfo, fetchTasks])

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
        await fetchTasks(listId)
      }
      setDraggedTaskId(null)
      setTaskDragOverColId(null)
    }
  }, [draggedTaskId, listId, moveTask, fetchTasks])

  const handleConfirmTaskAction = useCallback((taskId: string) => {
    setConfirmTaskId(taskId)
    setSelectedTaskId(null)
  }, [])

  const handleOpenTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
    setActiveTaskId(taskId)
    setTaskSheetInitialTab("chat")
    setTaskSheetOpen(true)
  }, [])

  const handleOpenWidgetForTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
    setWidgetDialogTaskId(taskId)
    setWidgetDialogOpen(true)
  }, [])

  useEffect(() => {
    if (!taskSheetOpen || !listId || !activeTaskId) {
      if (!taskSheetOpen) {
        setActiveTaskId(null)
        setActiveTaskData(null)
      }
      return
    }

    let cancelled = false
    setTaskSheetLoading(true)
    getTaskCard(listId, activeTaskId).then((data) => {
      if (!cancelled) {
        setActiveTaskData(data)
      }
    }).finally(() => {
      if (!cancelled) {
        setTaskSheetLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [taskSheetOpen, listId, activeTaskId, getTaskCard])

  const handleSendTaskMessageWithFiles = useCallback(async (taskId: string, content: string, files?: File[]) => {
    if (!listId) return null
    const sent = await sendTaskMessage(listId, taskId, content, files)
    if (sent && activeTaskId === taskId) {
      const refreshed = await getTaskCard(listId, taskId)
      if (refreshed) setActiveTaskData(refreshed)
    }
    return sent
  }, [listId, sendTaskMessage, getTaskCard, activeTaskId])

  useEffect(() => {
    if (!taskSheetOpen || !listId || !activeTaskId) return
    const timer = window.setInterval(async () => {
      const refreshed = await getTaskCard(listId, activeTaskId)
      if (refreshed) {
        setActiveTaskData(refreshed)
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [taskSheetOpen, listId, activeTaskId, getTaskCard])

  const refreshActiveTask = useCallback(async (taskId: string) => {
    if (!listId || activeTaskId !== taskId) return
    const refreshed = await getTaskCard(listId, taskId)
    if (refreshed) {
      setActiveTaskData(refreshed)
    }
  }, [listId, activeTaskId, getTaskCard])

  const refreshBoardAfterWidgetChange = useCallback(async (taskId: string) => {
    if (!listId) return
    await fetchTasks(listId)
    await getListInfo(listId).then((info) => {
      if (info) {
        setListInfo(info.list)
        setColumns(info.cols)
        setListUpdatedAt(info.list.updated_at)
      }
    })
    void refreshActiveTask(taskId)
  }, [listId, fetchTasks, getListInfo, refreshActiveTask])

  // Global keyboard handler for selected tasks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return

      // If confirmation dialog is open
      if (confirmTaskId !== null) {
        if (e.key === "Escape") {
          setConfirmTaskId(null)
          return
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault()
          // Delete/Backspace → actually delete
          if (confirmTaskId && listId) {
            deleteTask(listId, confirmTaskId)
          }
          setConfirmTaskId(null)
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          // Enter → archive
          if (confirmTaskId && listId) {
            archiveTask(listId, confirmTaskId)
          }
          setConfirmTaskId(null)
          return
        }
        return
      }

      // No dialog open, handle selection actions
      if (!selectedTaskId) return

      if (e.key === "Escape") {
        setSelectedTaskId(null)
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          // Ctrl/Shift+Delete → Archive directly
          if (listId) archiveTask(listId, selectedTaskId)
          setSelectedTaskId(null)
        } else {
          // Delete/Backspace → show confirm dialog
          setConfirmTaskId(selectedTaskId)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTaskId, confirmTaskId, listId, archiveTask, deleteTask])

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

  if (!listInfo) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2 lg:px-6">
          {projectId ? (
            <>
              <Link to={`/teams/${teamLogin}/projects`} className="text-sm text-muted-foreground hover:text-foreground">
                Проекты
              </Link>
              <ChevronRight className="size-4 text-muted-foreground" />
              <Link
                to={`/teams/${teamLogin}/projects/${projectId}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {projectName || "Проект"}
              </Link>
              <ChevronRight className="size-4 text-muted-foreground" />
            </>
          ) : (
            <>
              <Link to={`/teams/${teamLogin}/tasks`} className="text-sm text-muted-foreground hover:text-foreground">
                Задачи
              </Link>
              <ChevronRight className="size-4 text-muted-foreground" />
            </>
          )}
          <span className="text-sm text-muted-foreground">Список не найден</span>
        </div>
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">Список задач не найден или недоступен</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Проверьте, что этот список действительно существует в выбранном проекте.
          </p>
          {projectId ? (
            <Button className="mt-4" onClick={() => navigate(`/teams/${teamLogin}/projects/${projectId}`)}>
              Вернуться к проекту
            </Button>
          ) : (
            <Button className="mt-4" onClick={() => navigate(`/teams/${teamLogin}/tasks`)}>
              Вернуться к спискам
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Breadcrumbs */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2 lg:px-6">
        {projectId ? (
          <>
            <Link to={`/teams/${teamLogin}/projects`} className="text-sm text-muted-foreground hover:text-foreground">
              Проекты
            </Link>
            <ChevronRight className="size-4 text-muted-foreground" />
            <Link to={`/teams/${teamLogin}/projects/${projectId}`} className="text-sm text-muted-foreground hover:text-foreground">
              {projectName || "Проект"}
            </Link>
            <ChevronRight className="size-4 text-muted-foreground" />
          </>
        ) : (
          <>
            <Link to={`/teams/${teamLogin}/tasks`} className="text-sm text-muted-foreground hover:text-foreground">
              Задачи
            </Link>
            <ChevronRight className="size-4 text-muted-foreground" />
          </>
        )}
        <span className="text-sm font-medium">{listInfo.name}</span>
      </div>

      {/* Board header with Add column button */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          {renamingList ? (
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onBlur={() => {
                if (newListName.trim() && listId) {
                  editList?.(listId, { name: newListName.trim() }).then(() => {
                    getListInfo(listId).then((info) => { if (info) setListInfo(info.list) })
                    setRenamingList(false)
                  })
                } else {
                  setRenamingList(false)
                  setNewListName("")
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newListName.trim() && listId) {
                  editList?.(listId, { name: newListName.trim() }).then(() => {
                    getListInfo(listId).then((info) => { if (info) setListInfo(info.list) })
                    setRenamingList(false)
                  })
                }
                if (e.key === "Escape") { setRenamingList(false); setNewListName(listInfo?.name || "") }
              }}
              className="h-8 w-48 text-xl font-bold"
              autoFocus
            />
          ) : (
            <h1
              className="text-xl font-bold cursor-pointer hover:opacity-70 transition-opacity"
              onDoubleClick={() => { setRenamingList(true); setNewListName(listInfo?.name || "") }}
            >
              {listInfo?.name || "Загрузка..."}
            </h1>
          )}
          {isUpdating && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Обновляем...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {listInfo?.view_type !== "table" && !creatingColumn && (
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
          )}
          {listInfo?.view_type !== "table" && creatingColumn && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Название колонки"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                className="max-w-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()}>Создать</Button>
              <Button variant="ghost" size="sm" onClick={() => { setCreatingColumn(false); setNewColumnName("") }}>Отмена</Button>
            </div>
          )}
          {/* List settings gear */}
          {listInfo?.view_type === "table" && (
            <Button variant="outline" size="sm" onClick={() => setStagesOpen(true)}>
              <ListTodo className="mr-1 size-4" />
              Этапы
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="size-8 p-0">
                <Settings className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuItem onClick={() => { setRenamingList(true); setNewListName(listInfo?.name || "") }}>
                <Pencil className="mr-2 size-4" />
                Переименовать лист
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (listId && listInfo) {
                  const newView = listInfo.view_type === "kanban" ? "table" : "kanban"
                  editList?.(listId, { view_type: newView }).then(() => {
                    getListInfo(listId).then((info) => {
                      if (info) { setListInfo(info.list); setColumns(info.cols) }
                    })
                  })
                }
              }}>
                {listInfo?.view_type === "table" ? (
                  <><LayoutGrid className="mr-2 size-4" />Переключить на Канбан</>
                ) : (
                  <><Table className="mr-2 size-4" />Переключить на Таблицу</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                if (listId) {
                  columns.forEach((col) => {
                    archiveAllTasksInColumn(listId, col.id, true).then(() => fetchTasks(listId))
                  })
                }
              }}>
                <Archive className="mr-2 size-4" />
                Архивировать выполненные
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban board - scrollable area */}
      {listInfo?.view_type === "table" ? (
        <TableView
          columns={columns}
          tasks={tasks}
          onOpenTask={handleOpenTask}
          onToggleTask={(taskId) => {
            const task = tasks.find((t) => t.id === taskId)
            if (task && listId) toggleTask(listId, taskId, !!task.closed_at)
          }}
          onUpdateTaskDeadline={(taskId, deadline) => { if (listId) updateTaskDeadline(listId, taskId, deadline) }}
          onUpdateTaskPriority={(taskId, priority) => { if (listId) updateTaskPriority(listId, taskId, priority) }}
          onUpdateTaskColumn={(taskId, columnId) => { if (listId) moveTask(listId, taskId, columnId).then(() => fetchTasks(listId)) }}
          onArchiveTask={(taskId) => { if (listId) archiveTask(listId, taskId) }}
          onDeleteTask={(taskId) => { if (listId) deleteTask(listId, taskId) }}
          onUpdateTaskText={(taskId, text) => { if (listId) updateTaskText(listId, taskId, text) }}
          onUpdateTaskDescription={(taskId, desc) => { if (listId) updateTaskDescription(listId, taskId, desc) }}
          onCreateTask={(columnId, title) => { if (listId) createTask(listId, columnId, title) }}
          onAddColumn={(name) => { if (listId) createListCol(listId, name).then(() => getListInfo(listId).then((info) => { if (info) setColumns(info.cols) })) }}
          onRenameColumn={(columnId, name) => { if (listId) editListCol?.(listId, columnId, { name }).then(() => getListInfo(listId).then((info) => { if (info) setColumns(info.cols) })) }}
          editListCol={(columnId, updates) => { if (listId) return editListCol?.(listId, columnId, updates as any) ?? Promise.resolve(false); return Promise.resolve(false) }}
          onDeleteColumn={(columnId) => { if (listId) editListCol?.(listId, columnId, { is_deleted: true }).then(() => getListInfo(listId).then((info) => { if (info) setColumns(info.cols) })) }}
          onDeleteColumnWithTasks={async (columnId, onProgress) => {
            if (listId) {
              await deleteAllTasksInColumn(listId, columnId, onProgress)
              return true
            }
            return false
          }}
          stagesOpen={stagesOpen}
          onStagesOpenChange={setStagesOpen}
          teamLogin={teamLogin!}
        />
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto p-4 lg:p-6"
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
                    onArchiveAll={async (onProgress) => {
                      if (listId) {
                        await archiveAllTasksInColumn(listId, column.id, false, onProgress)
                        fetchTasks(listId)
                      }
                    }}
                    onArchiveCompleted={async (onProgress) => {
                      if (listId) {
                        await archiveAllTasksInColumn(listId, column.id, true, onProgress)
                        fetchTasks(listId)
                      }
                    }}
                    onDeleteAllTasks={async (onProgress) => {
                      if (listId) {
                        await deleteAllTasksInColumn(listId, column.id, onProgress)
                        fetchTasks(listId)
                      }
                    }}
                    onDragStartTask={handleTaskDragStart}
                    onDragEndTask={handleTaskDragEnd}
                    onDropTask={handleTaskDrop}
                    onDragOver={() => handleTaskDragOver(column.id)}
                    isTaskDragOver={taskDragOverColId === column.id}
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
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                    onOpenTask={handleOpenTask}
                    onAddWidget={handleOpenWidgetForTask}
                    onConfirmTaskAction={handleConfirmTaskAction}
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
      )}

      {/* Confirmation dialog for task delete/archive */}
      <Dialog open={confirmTaskId !== null} onOpenChange={(open) => { if (!open) setConfirmTaskId(null) }}>
        <DialogContent className="sm:max-w-[400px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Что сделать с задачей?</DialogTitle>
            <DialogDescription>
              Выберите действие для задачи
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                tabIndex={-1}
                onClick={() => {
                  if (confirmTaskId && listId) {
                    archiveTask(listId, confirmTaskId)
                  }
                  setConfirmTaskId(null)
                }}
              >
                <Archive className="mr-2 size-4" />
                В архив <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                tabIndex={-1}
                onClick={() => {
                  if (confirmTaskId && listId) {
                    deleteTask(listId, confirmTaskId)
                  }
                  setConfirmTaskId(null)
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Удалить <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd>
              </Button>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground text-center">
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd> — удалить задачу</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> — в архив</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd> — закрыть</span>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename list dialog */}
      <Dialog open={renamingList} onOpenChange={(open) => { if (!open) { setRenamingList(false); setNewListName("") } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Переименовать лист</DialogTitle>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newListName.trim() && listId) {
                editList?.(listId, { name: newListName.trim() }).then(() => {
                  getListInfo(listId).then((info) => { if (info) setListInfo(info.list) })
                  setRenamingList(false)
                })
              }
              if (e.key === "Escape") { setRenamingList(false); setNewListName("") }
            }}
            placeholder="Название листа"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenamingList(false); setNewListName("") }}>Отмена</Button>
            <Button onClick={() => {
              if (newListName.trim() && listId) {
                editList?.(listId, { name: newListName.trim() }).then(() => {
                  getListInfo(listId).then((info) => { if (info) setListInfo(info.list) })
                  setRenamingList(false)
                })
              }
            }} disabled={!newListName.trim()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailSheet
        open={taskSheetOpen}
        onOpenChange={(open) => {
          setTaskSheetOpen(open)
          if (!open) setWidgetDialogOpen(false)
        }}
        taskData={taskSheetLoading ? null : activeTaskData}
        initialTab={taskSheetInitialTab}
        columns={columns}
        onUpdateText={(taskId, text) => {
          if (!listId) return false
          return updateTaskText(listId, taskId, text).then((ok) => {
            void refreshActiveTask(taskId)
            return ok
          })
        }}
        onUpdateDescription={(taskId, desc) => {
          if (!listId) return false
          return updateTaskDescription(listId, taskId, desc).then((ok) => {
            void refreshActiveTask(taskId)
            return ok
          })
        }}
        onUpdateDeadline={(taskId, deadline) => {
          if (!listId) return false
          return updateTaskDeadline(listId, taskId, deadline).then((ok) => {
            void refreshActiveTask(taskId)
            return ok
          })
        }}
        onUpdatePriority={(taskId, priority) => {
          if (!listId) return false
          return updateTaskPriority(listId, taskId, priority).then((ok) => {
            void refreshActiveTask(taskId)
            return ok
          })
        }}
        onUpdateColumn={(taskId, columnId) => {
          if (!listId) return false
          return moveTask(listId, taskId, columnId).then((ok) => {
            void refreshActiveTask(taskId)
            return ok
          })
        }}
        onToggleTask={(taskId) => {
          const task = tasks.find((t) => t.id === taskId)
          if (task && listId) {
            toggleTask(listId, taskId, !!task.closed_at)
            void getTaskCard(listId, taskId).then((data) => { if (data) setActiveTaskData(data) })
          }
        }}
        onArchiveTask={(taskId) => {
          if (listId) {
            archiveTask(listId, taskId)
            setTaskSheetOpen(false)
          }
        }}
        onDeleteTask={(taskId) => {
          if (listId) {
            deleteTask(listId, taskId)
            setTaskSheetOpen(false)
          }
        }}
        onSendMessage={handleSendTaskMessageWithFiles}
        onEditMessage={(messageId, content) => listId ? editTaskMessage(listId, { message_id: messageId, content }) : false}
        onDeleteMessage={(messageId) => listId ? deleteTaskMessage(listId, messageId) : false}
        onEditAttachment={(attachmentId, fileName) => listId ? editTaskAttachment(listId, attachmentId, fileName) : false}
        onDeleteAttachment={(attachmentId) => listId ? deleteTaskAttachment(listId, attachmentId) : false}
        onUpsertWidget={(payload) => {
          if (!listId) return false
          return Promise.resolve(upsertTaskWidget(listId, payload)).then((ok) => {
            if (ok) void refreshBoardAfterWidgetChange(payload.task_id)
            return ok
          })
        }}
        onDeleteWidget={(widgetId) => {
          if (!listId) return false
          return Promise.resolve(deleteTaskWidget(listId, widgetId)).then((ok) => {
            if (ok) void refreshBoardAfterWidgetChange(widgetDialogTaskId || activeTaskId || "")
            return ok
          })
        }}
        onAddWidgetRequest={() => {
          if (!activeTaskId && !selectedTaskId) return
          setWidgetDialogTaskId(activeTaskId || selectedTaskId)
          setWidgetDialogOpen(true)
        }}
      />

      <TaskWidgetDialog
        open={widgetDialogOpen}
        onOpenChange={(open) => {
          setWidgetDialogOpen(open)
          if (!open) setWidgetDialogTaskId(null)
        }}
        taskId={widgetDialogTaskId}
        teamMembers={teamMembers}
        onUpsertWidget={(payload) => {
          if (!listId) return false
          return Promise.resolve(upsertTaskWidget(listId, payload)).then((ok) => {
            if (ok) void refreshBoardAfterWidgetChange(payload.task_id)
            return ok
          })
        }}
        onSaved={() => {
          if (widgetDialogTaskId) void refreshBoardAfterWidgetChange(widgetDialogTaskId)
        }}
      />
    </div>
  )
}
