import { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Check,
  MoreHorizontal,
  CalendarIcon,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowUpZA,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Archive,
  Pencil,
  X,
  Loader2,
  Columns,
} from "lucide-react"
import type { Task, TaskColumn } from "@/types/task"
import { PRIORITY_COLORS, COLUMN_COLORS } from "@/types/task"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useProfiles, type UserProfile } from "@/hooks/use-profiles"
import { useTeams } from "@/hooks/use-teams"
import { Link2, Mail, Phone, DollarSign } from "lucide-react"
import type { TaskWidget } from "@/types/task"

type SortField = "title" | "stage" | "priority" | "deadline"
type SortDir = "asc" | "desc"

type VisibleColumns = {
  completion: boolean
  title: boolean
  stage: boolean
  priority: boolean
  deadline: boolean
  createdAt: boolean
  updatedAt: boolean
  completedAt: boolean
  createdBy: boolean
  menu: boolean
}

function UserProfileBadge({ userId, getProfile }: { userId: string; getProfile: (id: string) => UserProfile | null }) {
  const profile = getProfile(userId)
  if (!profile) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="size-5 rounded-full bg-muted" />
        <span className="truncate">{userId.slice(0, 8)}...</span>
      </div>
    )
  }
  const initials = `${profile.last_name?.[0] || ""}${profile.first_name?.[0] || ""}`.toUpperCase() || "?"
  return (
    <Badge variant="outline" className="flex items-center gap-1.5 py-0.5 pr-2 pl-0.5">
      <Avatar className="size-5">
        <AvatarImage src={profile.img_url} />
        <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="truncate">{profile.last_name} {profile.first_name}</span>
    </Badge>
  )
}

interface TableViewProps {
  columns: TaskColumn[]
  tasks: Task[]
  onToggleTask: (id: string) => void
  onUpdateTaskDeadline: (id: string, deadline: string) => void
  onUpdateTaskPriority: (id: string, priority: string) => void
  onUpdateTaskColumn: (id: string, columnId: string) => void
  onArchiveTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTaskText: (id: string, text: string) => void
  onUpdateTaskDescription: (id: string, desc: string) => void
  onCreateTask: (columnId: string, title: string) => void
  onOpenTask: (id: string) => void
  // Stage management
  stagesOpen: boolean
  onStagesOpenChange: (open: boolean) => void
  onAddColumn: (name: string) => void
  onRenameColumn: (columnId: string, name: string) => void
  editListCol?: (colId: string, updates: { name?: string; color_hex?: string }) => Promise<boolean>
  onDeleteColumn: (columnId: string) => void
  onDeleteColumnWithTasks: (columnId: string, onProgress?: (done: number, total: number) => void) => Promise<boolean>
  teamLogin: string
  teamMembers?: Array<{ id: string; first_name: string; last_name: string; img_url: string | null }>
}

export function TableView({
  columns,
  tasks,
  onToggleTask,
  onUpdateTaskDeadline,
  onUpdateTaskPriority,
  onUpdateTaskColumn,
  onArchiveTask,
  onDeleteTask,
  onUpdateTaskText,
  onUpdateTaskDescription,
  onCreateTask,
  onOpenTask,
  stagesOpen,
  onStagesOpenChange,
  onAddColumn,
  onRenameColumn,
  editListCol,
  onDeleteColumn,
  onDeleteColumnWithTasks,
  teamLogin,
  teamMembers = [],
}: TableViewProps) {
  const { getProfile, fetchProfiles } = useProfiles()
  const { teamMembership } = useTeams()
  const [visibleCols, setVisibleCols] = useState<VisibleColumns>({
    completion: true,
    title: true,
    stage: true,
    priority: true,
    deadline: true,
    createdAt: false,
    updatedAt: false,
    completedAt: false,
    createdBy: false,
    menu: true,
  })
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("stage")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null)
  const [editingStageTaskId, setEditingStageTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskColumn, setNewTaskColumn] = useState(columns[0]?.id || "")

  // Inline editing
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleText, setEditingTitleText] = useState("")
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [editingDescText, setEditingDescText] = useState("")

  // Stage management
  const [stageAction, setStageAction] = useState<"add" | "rename" | null>(null)
  const [stageActionColumnId, setStageActionColumnId] = useState<string | null>(null)
  const [stageName, setStageName] = useState("")
  const [deleteStageConfirm, setDeleteStageConfirm] = useState<string | null>(null)
  const [deleteProgress, setDeleteProgress] = useState(0)
  const [deleteTotal, setDeleteTotal] = useState(0)

  // Deadline editing
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null)
  const [editingDeadlineDate, setEditingDeadlineDate] = useState<Date | undefined>()
  const [editingDeadlineTime, setEditingDeadlineTime] = useState("12:00")

  // Fetch profiles for unknown users
  useEffect(() => {
    const teamLoginStr = teamMembership?.team ? teamLogin : ""
    if (!teamLoginStr) return
    const userIds = [...new Set(tasks.map((t) => t.created_by).filter(Boolean))]
    fetchProfiles(teamLoginStr, userIds)
  }, [tasks, teamLogin, teamMembership, fetchProfiles])

  const getColumnName = (columnId: string) => columns.find((c) => c.id === columnId)?.name || "—"
  const getColumnColor = (columnId: string) => columns.find((c) => c.id === columnId)?.color || "#6b7280"

  const getWidgetMeta = (widget: TaskWidget) => {
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
      date: <CalendarIcon className="size-3.5" />,
      text: <Pencil className="size-3.5" />,
      link: <Link2 className="size-3.5" />,
      email: <Mail className="size-3.5" />,
      phone: <Phone className="size-3.5" />,
      fio: <div className="text-[10px] font-semibold">ФИО</div>,
      money: <DollarSign className="size-3.5" style={moneyColor ? { color: moneyColor } : undefined} />,
      assignee: member ? (
        <span className="flex size-4 overflow-hidden rounded-full bg-muted">
          {member.img_url ? <img src={member.img_url} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-[10px] font-semibold">{memberInitials || "?"}</span>}
        </span>
      ) : (
        <div className="size-3.5 rounded-full bg-muted" />
      ),
    }[widget.type]

    const label =
      widget.type === "assignee"
        ? memberName || "Ответственный"
        : widget.value || widget.title || "—"

    return { icon, label }
  }

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return
      if (confirmTaskId !== null) return
      if (!selectedTaskId) return
      if (e.key === "Escape") { setSelectedTaskId(null); return }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          const task = tasks.find((t) => t.id === selectedTaskId)
          if (task) onArchiveTask(selectedTaskId)
        } else {
          setConfirmTaskId(selectedTaskId)
        }
        setSelectedTaskId(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTaskId, confirmTaskId, tasks, onArchiveTask])

  const filteredTasks = useMemo(() => {
    let filtered = tasks
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(s) || (t.description?.toLowerCase().includes(s) ?? false))
    }
    const sorted = [...filtered].sort((a, b) => {
      let aVal = "", bVal = ""
      switch (sortField) {
        case "title": aVal = a.title; bVal = b.title; break
        case "stage": aVal = getColumnName(a.column_id); bVal = getColumnName(b.column_id); break
        case "priority": aVal = a.priority || ""; bVal = b.priority || ""; break
        case "deadline": aVal = a.deadline_date || "9999"; bVal = b.deadline_date || "9999"; break
      }
      const cmp = aVal.localeCompare(bVal)
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [tasks, search, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  const handleCreateTask = () => {
    if (newTaskTitle.trim() && newTaskColumn) {
      onCreateTask(newTaskColumn, newTaskTitle.trim())
      setNewTaskTitle("")
      setCreateOpen(false)
    }
  }

  const startEditTitle = (taskId: string, currentTitle: string) => {
    setEditingTitleId(taskId)
    setEditingTitleText(currentTitle)
  }

  const saveTitle = () => {
    if (editingTitleId && editingTitleText.trim()) {
      onUpdateTaskText(editingTitleId, editingTitleText.trim())
    }
    setEditingTitleId(null)
  }

  const startEditDesc = (taskId: string, currentDesc: string) => {
    setEditingDescId(taskId)
    setEditingDescText(currentDesc || "")
  }

  const saveDesc = () => {
    if (editingDescId) {
      onUpdateTaskDescription(editingDescId, editingDescText.trim())
    }
    setEditingDescId(null)
  }

  const handleDeleteStage = async (columnId: string) => {
    const taskCount = tasks.filter((t) => t.column_id === columnId).length
    setDeleteTotal(taskCount)
    setDeleteProgress(0)
    setDeleteStageConfirm(columnId)
    // Start deleting tasks immediately
    const ok = await onDeleteColumnWithTasks(columnId, (done, total) => {
      setDeleteProgress(done)
      setDeleteTotal(total)
    })
    if (ok) {
      // After tasks are deleted, delete the column
      onDeleteColumn(columnId)
      setDeleteStageConfirm(null)
      setDeleteProgress(0)
      setDeleteTotal(0)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск задач..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            {[
              { field: "title" as SortField, label: "Название" },
              { field: "stage" as SortField, label: "Этап" },
              { field: "priority" as SortField, label: "Приоритет" },
              { field: "deadline" as SortField, label: "Дедлайн" },
            ].map(({ field, label }) => (
              <Button
                key={field}
                variant={sortField === field ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort(field)}
              >
                {sortField === field ? (sortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowUpZA className="size-4" />) : <ArrowUpDown className="size-4" />}
                <span className="ml-1 hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu open={columnsOpen} onOpenChange={setColumnsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="mr-1 size-4" />
                Колонки
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {[
                { key: "createdAt" as const, label: "Дата создания" },
                { key: "updatedAt" as const, label: "Дата изменения" },
                { key: "completedAt" as const, label: "Дата выполнения" },
                { key: "createdBy" as const, label: "Автор" },
              ].map(({ key, label }) => (
                <DropdownMenuItem key={key} onSelect={(e) => e.preventDefault()} onClick={() => setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }))}>
                  <Checkbox checked={visibleCols[key]} className="mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setCreateOpen(true); setNewTaskColumn(columns[0]?.id || ""); setNewTaskTitle("") }}>
            <Plus className="mr-1 size-4" />
            Добавить задачу
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {visibleCols.completion && <th className="w-10 p-3 text-center"></th>}
              {visibleCols.title && <th className="p-3 text-left font-medium">Задача</th>}
              {visibleCols.stage && <th className="w-40 p-3 text-left font-medium">Этап</th>}
              {visibleCols.priority && <th className="w-32 p-3 text-left font-medium">Приоритет</th>}
              {visibleCols.deadline && <th className="w-36 p-3 text-left font-medium">Дедлайн</th>}
              {visibleCols.createdAt && <th className="w-32 p-3 text-left font-medium">Создана</th>}
              {visibleCols.updatedAt && <th className="w-32 p-3 text-left font-medium">Изменена</th>}
              {visibleCols.completedAt && <th className="w-32 p-3 text-left font-medium">Выполнена</th>}
              {visibleCols.createdBy && <th className="w-48 p-3 text-left font-medium">Автор</th>}
              {visibleCols.menu && <th className="w-10 p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className={cn(
                  "border-t transition-colors cursor-pointer",
                  selectedTaskId === task.id ? "bg-primary/5" : "hover:bg-muted/30"
                )}
                onClick={() => {
                  setSelectedTaskId(selectedTaskId === task.id ? null : task.id)
                  onOpenTask(task.id)
                }}
              >
                {/* Completion */}
                {visibleCols.completion && (
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleTask(task.id)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={cn(
                        "flex size-5 items-center justify-center rounded-sm border transition-colors mx-auto",
                        task.closed_at
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-input hover:border-ring"
                      )}
                    >
                      {task.closed_at && <Check className="size-3" />}
                    </button>
                  </td>
                )}
                {/* Title + Description */}
                {visibleCols.title && (
                  <td className="p-3 max-w-[350px]">
                  {editingTitleId === task.id ? (
                    <Input
                      onClick={(e) => e.stopPropagation()}
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle()
                        if (e.key === "Escape") { setEditingTitleId(null); setEditingTitleText(task.title) }
                      }}
                      className="h-7 text-sm font-medium"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="font-medium"
                      onDoubleClick={() => startEditTitle(task.id, task.title)}
                    >
                      {task.title}
                    </div>
                  )}
                  {task.widgets?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {task.widgets.slice(0, 3).map((widget) => (
                        <span key={widget.id} className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                          <span className="inline-flex size-4 items-center justify-center rounded-full bg-muted/80">
                            {(() => {
                              const meta = getWidgetMeta(widget)
                              return meta.icon
                            })()}
                          </span>
                          <span className="truncate">
                            {(() => {
                              const meta = getWidgetMeta(widget)
                              return meta.label
                            })()}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {editingDescId === task.id ? (
                    <Textarea
                      onClick={(e) => e.stopPropagation()}
                      value={editingDescText}
                      onChange={(e) => setEditingDescText(e.target.value)}
                      onBlur={saveDesc}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveDesc() }
                        if (e.key === "Escape") { setEditingDescId(null); setEditingDescText(task.description || "") }
                      }}
                      className="min-h-[40px] mt-1 text-xs"
                      placeholder="Описание..."
                      autoFocus
                    />
                  ) : task.description ? (
                    <div
                      className="mt-1 text-xs text-muted-foreground line-clamp-2 cursor-text"
                      onDoubleClick={() => startEditDesc(task.id, task.description || "")}
                    >
                      {task.description}
                    </div>
                  ) : (
                    <div
                      className="mt-1 text-xs text-muted-foreground/50 cursor-text italic"
                      onDoubleClick={() => startEditDesc(task.id, "")}
                    >
                      + описание
                    </div>
                  )}
                </td>
                )}
                {/* Stage */}
                {visibleCols.stage && (
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingStageTaskId(task.id)
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                    style={{ backgroundColor: `${getColumnColor(task.column_id)}15`, color: getColumnColor(task.column_id) }}
                  >
                    <div className="size-2 rounded-full" style={{ backgroundColor: getColumnColor(task.column_id) }} />
                    {getColumnName(task.column_id)}
                  </button>
                </td>
                )}
                {/* Priority */}
                {visibleCols.priority && (
                <td className="p-3">
                  <Select value={task.priority || "_none"} onValueChange={(v) => onUpdateTaskPriority(task.id, v === "_none" ? "" : v)}>
                    <SelectTrigger className="h-auto border-0 bg-transparent shadow-none w-fit p-0 text-xs font-medium hover:bg-muted">
                      <SelectValue>
                        {task.priority && (
                          <span className={cn("flex items-center gap-1", PRIORITY_COLORS[task.priority] || "text-muted-foreground")}>
                            <div className={cn("size-2 rounded-full", task.priority === "high" ? "bg-red-500" : task.priority === "low" ? "bg-blue-500" : "bg-yellow-500")} />
                            {task.priority === "high" ? "Высокий" : task.priority === "low" ? "Низкий" : "Средний"}
                          </span>
                        )}
                        {!task.priority && <span className="text-muted-foreground">—</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none"><span className="text-muted-foreground">Без приорета</span></SelectItem>
                      <SelectItem value="low"><span className="flex items-center gap-2"><div className="size-2 rounded-full bg-blue-500" />Низкий</span></SelectItem>
                      <SelectItem value="medium"><span className="flex items-center gap-2"><div className="size-2 rounded-full bg-yellow-500" />Средний</span></SelectItem>
                      <SelectItem value="high"><span className="flex items-center gap-2"><div className="size-2 rounded-full bg-red-500" />Высокий</span></SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                )}
                {/* Deadline */}
                {visibleCols.deadline && (
                <td className="p-3">
                  {editingDeadlineId === task.id ? (
                    <Popover defaultOpen onOpenChange={(open) => { if (!open) setEditingDeadlineId(null) }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs justify-start w-full">
                          <CalendarIcon className="mr-1 size-3" />
                          {editingDeadlineDate ? format(editingDeadlineDate, "dd.MM.yy") : "Выбрать"}
                        </Button>
                      </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editingDeadlineDate}
                            onSelect={(date) => {
                              if (date) {
                                const h = editingDeadlineTime.split(":")[0] || "12"
                                const m = editingDeadlineTime.split(":")[1] || "00"
                                date.setHours(parseInt(h), parseInt(m), 0)
                                setEditingDeadlineDate(date)
                                onUpdateTaskDeadline(task.id, date.toISOString())
                              }
                            }}
                            locale={ru}
                            className="w-full"
                          />
                          <div className="border-t px-3 py-2">
                            <Input
                              type="time"
                              value={editingDeadlineTime}
                              onChange={(e) => {
                                setEditingDeadlineTime(e.target.value)
                                if (editingDeadlineDate) {
                                  const [h, m] = e.target.value.split(":").map(Number)
                                  const d = new Date(editingDeadlineDate)
                                  d.setHours(h, m, 0)
                                  setEditingDeadlineDate(d)
                                  onUpdateTaskDeadline(task.id, d.toISOString())
                                }
                              }}
                              className="h-7 text-xs [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                          </div>
                          {task.deadline_date && (
                            <div className="border-t p-2">
                              <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground hover:text-destructive" onClick={() => { setEditingDeadlineId(null); setEditingDeadlineDate(undefined); onUpdateTaskDeadline(task.id, "") }}>
                                Убрать дедлайн
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5",
                        task.deadline_date && new Date(task.deadline_date) < new Date() ? "text-red-500" : "text-muted-foreground"
                      )}
                      onDoubleClick={() => {
                        setEditingDeadlineId(task.id)
                        setEditingDeadlineDate(task.deadline_date ? new Date(task.deadline_date) : new Date())
                        setEditingDeadlineTime(task.deadline_date ? format(new Date(task.deadline_date), "HH:mm") : "12:00")
                      }}
                    >
                      {task.deadline_date ? (
                        <><CalendarIcon className="size-3" />{format(new Date(task.deadline_date), "dd.MM.yy")}</>
                      ) : (
                        <span className="text-muted-foreground/50 italic">+ дедлайн</span>
                      )}
                    </div>
                  )}
                </td>
                )}
                {/* Created date */}
                {visibleCols.createdAt && (
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(new Date(task.created_at), "dd.MM.yy HH:mm")}
                  </td>
                )}
                {/* Updated date */}
                {visibleCols.updatedAt && (
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(new Date(task.updated_at), "dd.MM.yy HH:mm")}
                  </td>
                )}
                {/* Completed date */}
                {visibleCols.completedAt && (
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.closed_at ? format(new Date(task.closed_at), "dd.MM.yy HH:mm") : "—"}
                  </td>
                )}
                {/* Created by */}
                {visibleCols.createdBy && (
                <td className="p-3">
                  <UserProfileBadge userId={task.created_by} getProfile={getProfile} />
                </td>
                )}
                {/* Menu */}
                {visibleCols.menu && (
                  <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[200px]">
                      <DropdownMenuItem onClick={() => startEditTitle(task.id, task.title)}>
                        <Pencil className="mr-2 size-4" />
                        Изменить название
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => startEditDesc(task.id, task.description || "")}>
                        <Pencil className="mr-2 size-4" />
                        Изменить описание
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <AlertTriangle className="mr-2 size-4" />
                          Приоритет
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => onUpdateTaskPriority(task.id, "low")}>Низкий</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateTaskPriority(task.id, "medium")}>Средний</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateTaskPriority(task.id, "high")}>Высокий</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateTaskPriority(task.id, "")}>Без приорета</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => {
                        setEditingDeadlineId(task.id)
                        setEditingDeadlineDate(task.deadline_date ? new Date(task.deadline_date) : new Date())
                        setEditingDeadlineTime(task.deadline_date ? format(new Date(task.deadline_date), "HH:mm") : "12:00")
                      }}>
                        <CalendarIcon className="mr-2 size-4" />
                        Изменить дедлайн
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingStageTaskId(task.id)}>
                        <Pencil className="mr-2 size-4" />
                        Изменить этап
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchiveTask(task.id)}>
                        <Archive className="mr-2 size-4" />
                        Архивировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => {
                        setConfirmTaskId(task.id)
                        setSelectedTaskId(null)
                      }}>
                        <Trash2 className="mr-2 size-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={Object.values(visibleCols).filter(Boolean).length} className="p-8 text-center text-muted-foreground">
                  {search ? "Ничего не найдено" : "Нет задач"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stage change dialog */}
      <Dialog open={editingStageTaskId !== null} onOpenChange={(open) => { if (!open) setEditingStageTaskId(null) }}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Изменить этап</DialogTitle>
            <DialogDescription>Выберите новый этап для задачи</DialogDescription>
          </DialogHeader>
          <Select
            value={columns.find((c) => c.id === tasks.find((t) => t.id === editingStageTaskId)?.column_id)?.id || ""}
            onValueChange={(val) => {
              if (editingStageTaskId) { onUpdateTaskColumn(editingStageTaskId, val); setEditingStageTaskId(null) }
            }}
          >
            <SelectTrigger><SelectValue placeholder="Выберите этап" /></SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* Create task dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Создать задачу</DialogTitle>
            <DialogDescription>Заполните информацию о новой задаче</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input placeholder="Название задачи" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTask()} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Этап *</label>
              <Select value={newTaskColumn} onValueChange={setNewTaskColumn}>
                <SelectTrigger><SelectValue placeholder="Выберите этап" /></SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full" style={{ backgroundColor: col.color }} />
                        {col.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || !newTaskColumn}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task delete/archive confirmation */}
      <Dialog open={confirmTaskId !== null} onOpenChange={(open) => { if (!open) setConfirmTaskId(null) }}>
        <DialogContent className="sm:max-w-[400px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Что сделать с задачей?</DialogTitle>
            <DialogDescription>Выберите действие для задачи</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" tabIndex={-1} onClick={() => { if (confirmTaskId) onArchiveTask(confirmTaskId); setConfirmTaskId(null) }}>
                <Archive className="mr-2 size-4" />В архив <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
              </Button>
              <Button variant="destructive" className="flex-1" tabIndex={-1} onClick={() => { if (confirmTaskId) onDeleteTask(confirmTaskId); setConfirmTaskId(null) }}>
                <Trash2 className="mr-2 size-4" />Удалить <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd>
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

      {/* Stage management dialog */}
      <Dialog open={stagesOpen} onOpenChange={(open) => { if (!open) { onStagesOpenChange(false); setStageAction(null); setStageName("") } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Управление этапами</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-auto">
            {/* Add stage */}
            {stageAction === "add" ? (
              <div className="flex items-center gap-2">
                <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Название этапа" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && stageName.trim()) { onAddColumn(stageName.trim()); setStageAction(null); setStageName("") } if (e.key === "Escape") { setStageAction(null); setStageName("") } }} />
                <Button size="sm" onClick={() => { if (stageName.trim()) { onAddColumn(stageName.trim()); setStageAction(null); setStageName("") } }}>Добавить</Button>
                <Button variant="ghost" size="sm" onClick={() => { setStageAction(null); setStageName("") }}><X className="size-4" /></Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start" onClick={() => setStageAction("add")}>
                <Plus className="mr-2 size-4" />Добавить этап
              </Button>
            )}
            {/* Stages list */}
            {columns.map((col) => {
              const taskCount = tasks.filter((t) => t.column_id === col.id).length
              return stageActionColumnId === col.id ? (
                <div key={col.id} className="flex items-center gap-2">
                  <Input value={stageName} onChange={(e) => setStageName(e.target.value)} className="flex-1 min-w-[120px]" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && stageName.trim()) { onRenameColumn(col.id, stageName.trim()); setStageActionColumnId(null); setStageName("") } if (e.key === "Escape") { setStageActionColumnId(null); setStageName("") } }} />
                  <Button size="sm" onClick={() => { if (stageName.trim()) { onRenameColumn(col.id, stageName.trim()); } setStageActionColumnId(null); setStageName("") }}>OK</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setStageActionColumnId(null); setStageName("") }}><X className="size-4" /></Button>
                </div>
              ) : (
                <div key={col.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-sm font-medium">{col.name}</span>
                    <span className="text-xs text-muted-foreground">({taskCount} задач)</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[200px]">
                      <DropdownMenuItem onClick={() => { setStageActionColumnId(col.id); setStageName(col.name) }}>
                        <Pencil className="mr-2 size-4" />Переименовать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Цвет этапа</p>
                        <div className="grid grid-cols-7 gap-1.5">
                          {COLUMN_COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={async () => {
                                await editListCol?.(col.id, { color_hex: c.value })
                              }}
                              className="flex size-6 items-center justify-center rounded-full transition-transform hover:scale-125"
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            >
                              {col.color === c.value && (
                                <span className="size-2 rounded-full bg-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStage(col.id)}>
                        <Trash2 className="mr-2 size-4" />Удалить этап
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete stage confirmation */}
      <Dialog open={deleteStageConfirm !== null} onOpenChange={(open) => { if (!open) { setDeleteStageConfirm(null); setDeleteProgress(0); setDeleteTotal(0) } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Удалить этап?</DialogTitle>
            <DialogDescription>
              {deleteProgress > 0
                ? `Удалено ${deleteProgress} из ${deleteTotal} задач`
                : `Этап «${columns.find((c) => c.id === deleteStageConfirm)?.name}» и ${deleteTotal} задач будут удалены безвозвратно`
              }
            </DialogDescription>
          </DialogHeader>
          {deleteProgress > 0 && (
            <div className="space-y-2">
              <Progress value={(deleteProgress / deleteTotal) * 100} className="h-2" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteStageConfirm(null); setDeleteProgress(0); setDeleteTotal(0) }} disabled={deleteProgress > 0 && deleteProgress < deleteTotal}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={deleteProgress > 0 && deleteProgress < deleteTotal}
              onClick={() => handleDeleteStage(deleteStageConfirm!)}
            >
              {deleteProgress > 0 ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Удалить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
