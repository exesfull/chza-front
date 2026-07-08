import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowUpAZ,
  ArrowUpZA,
  Calendar,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronRight,
  FolderPlus,
  Link2,
  ListTodo,
  Plus,
  Search,
  Settings,
  Trash2,
  SquareStack,
  MoveRight,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"
import { useBoards } from "@/hooks/use-boards"

type BoardSort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc"
type ProjectCreateType = "folder" | "task_list" | "link" | "board" | "calendar"

interface ProjectGridItem {
  id: string
  project_item_id?: string
  type: ProjectCreateType
  title: string
  description: string | null
  url?: string
  parent_id: string | null
  updated_at: string | null
  children: ProjectGridItem[]
  depth?: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}

function getProjectItemIcon(type: ProjectCreateType) {
  if (type === "folder") return FolderPlus
  if (type === "task_list") return ListTodo
  if (type === "link") return Link2
  if (type === "calendar") return Calendar
  return SquareStack
}

function flattenProjectItems(items: ProjectGridItem[], depth = 0): ProjectGridItem[] {
  const output: ProjectGridItem[] = []
  const walk = (entry: ProjectGridItem, currentDepth: number) => {
    output.push({ ...entry, depth: currentDepth })
    entry.children.forEach((child) => walk(child, currentDepth + 1))
  }
  items.forEach((item) => walk(item, depth))
  return output
}

function mapApiProjectItems(items: NonNullable<ProjectDetail["items"]>): ProjectGridItem[] {
  return items.map((item) => ({
    id: item.object_id || item.id,
    project_item_id: item.id,
    type: item.object_type as ProjectCreateType,
    title: item.name,
    description: item.description,
    url: undefined,
    parent_id: item.parent_id,
    updated_at: item.updated_at,
    children: mapApiProjectItems(item.children || []),
  }))
}

export function ProjectPage() {
  const { teamLogin, projectId } = useParams()
  const navigate = useNavigate()
  const { getProject, createFolder, renameItem, moveItem, deleteItem } = useProjects(teamLogin, { autoLoad: false })
  const { createBoard } = useBoards(teamLogin)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardSearch, setBoardSearch] = useState("")
  const [boardSort, setBoardSort] = useState<BoardSort>("updated_desc")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<"choose" | "form">("choose")
  const [createType, setCreateType] = useState<ProjectCreateType>("folder")
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkComment, setLinkComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId?: string | null; parentId?: string | null } | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameItemId, setRenameItemId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null)

  const refreshProject = async () => {
    if (!projectId) return
    const data = await getProject(projectId)
    setProject(data)
  }

  useEffect(() => {
    let cancelled = false

    const loadProject = async () => {
      if (!projectId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const data = await getProject(projectId)
      if (!cancelled) {
        setProject(data)
        setLoading(false)
      }
    }

    loadProject()
    return () => {
      cancelled = true
    }
  }, [projectId, getProject])

  useEffect(() => {
    document.title = project?.name ? `Проект: ${project.name}` : "Проект"
  }, [project])

  const projectItems = useMemo(() => {
    const itemsFromApi = project?.items ? mapApiProjectItems(project.items) : []
    const fallbackItems: ProjectGridItem[] = [
      ...(project?.task_lists || []).map((item) => ({
        id: item.id,
        type: "task_list" as const,
        title: item.name,
        description: item.description,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
      ...(project?.links || []).map((item) => ({
        id: item.id,
        type: "link" as const,
        title: item.title,
        description: item.comment,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
      ...(project?.boards || []).map((item) => ({
        id: item.id,
        type: "board" as const,
        title: item.name,
        description: item.description,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
    ]

    const source = flattenProjectItems([
      ...itemsFromApi,
      ...fallbackItems.filter((fallbackItem) => !itemsFromApi.some((item) => item.type === fallbackItem.type && item.id === fallbackItem.id)),
    ])
    const filtered = source.filter((item) => {
      const haystack = `${item.title} ${item.description || ""}`.toLowerCase()
      return haystack.includes(boardSearch.toLowerCase())
    })

    return filtered.sort((a, b) => {
      switch (boardSort) {
        case "name_asc":
          return a.title.localeCompare(b.title, "ru")
        case "name_desc":
          return b.title.localeCompare(a.title, "ru")
        case "updated_asc":
          return new Date((a.updated_at || "").replace(" ", "T")).getTime() - new Date((b.updated_at || "").replace(" ", "T")).getTime()
        default:
          return new Date((b.updated_at || "").replace(" ", "T")).getTime() - new Date((a.updated_at || "").replace(" ", "T")).getTime()
      }
    })
  }, [project?.items, project?.task_lists, project?.links, project?.boards, boardSearch, boardSort])

  const folderItems = useMemo(() => projectItems.filter((item) => item.type === "folder"), [projectItems])
  const currentItem = contextMenu?.itemId ? projectItems.find((item) => item.id === contextMenu.itemId) || null : null
  const currentFolder = currentFolderId ? projectItems.find((item) => item.id === currentFolderId) || null : null
  const visibleItems = useMemo(() => {
    const source = boardSearch.trim()
      ? projectItems
      : projectItems.filter((item) => (currentFolderId ? item.parent_id === currentFolderId : !item.parent_id))
    return source.filter((item) => {
      const typeLabel = item.type === "folder" ? "Папка" : item.type === "task_list" ? "Список задач" : item.type === "link" ? "Ссылка" : item.type === "calendar" ? "Календарь" : "Доска"
      return `${item.title} ${item.description || ""} ${typeLabel}`.toLowerCase().includes(boardSearch.toLowerCase())
    })
  }, [projectItems, currentFolderId, boardSearch])

  const getItemLink = (item: ProjectGridItem) => {
    if (item.type === "task_list") return `/teams/${teamLogin}/projects/${projectId}/tasks/${item.id}`
    if (item.type === "board") return `/teams/${teamLogin}/projects/${projectId}/boards/${item.id}`
    if (item.type === "link") {
      const link = project?.links?.find((l) => l.id === item.id)
      return link?.url || ""
    }
    return ""
  }

  const getItemKindLabel = (item: ProjectGridItem) => {
    switch (item.type) {
      case "folder":
        return "Папка"
      case "task_list":
        return "Список задач"
      case "link":
        return "Ссылка"
      case "calendar":
        return "Календарь"
      default:
        return "Доска"
    }
  }

  const resetCreate = () => {
    setCreateOpen(false)
    setCreateStep("choose")
    setCreateType("folder")
    setCreateName("")
    setCreateDescription("")
    setCreateParentId(null)
    setLinkUrl("")
    setLinkComment("")
    setFormError("")
    setSubmitting(false)
  }

  const openCreate = (type?: ProjectCreateType, parentId?: string | null) => {
    setCreateOpen(true)
    setCreateStep(type ? "form" : "choose")
    setCreateType(type || "folder")
    setCreateParentId(parentId ?? null)
    setFormError("")
  }

  const handleCreate = async () => {
    if (!teamLogin || !projectId || submitting) return
    setSubmitting(true)
    setFormError("")

    try {
      if (createType === "folder") {
        if (!createName.trim()) {
          setFormError("Укажите название папки")
          return
        }
        const folder = await createFolder(projectId, {
          name: createName.trim(),
          description: createDescription.trim(),
          parent_id: createParentId,
        })
        if (!folder) throw new Error("folder_create_failed")
        await refreshProject()
        resetCreate()
        return
      }

      if (createType === "link") {
        if (!createName.trim() || !linkUrl.trim()) {
          setFormError("Укажите название и URL ссылки")
          return
        }
        const form = new URLSearchParams()
        form.append("title", createName.trim())
        form.append("url", linkUrl.trim())
        if (linkComment.trim()) form.append("comment", linkComment.trim())
        if (createParentId) form.append("parent_id", createParentId)
        const { data } = await api.post(
          `/main/links/create/?team_login=${teamLogin}&project_id=${projectId}`,
          form,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
        if (!data.status) throw new Error(data?.error || "link_create_failed")
        await refreshProject()
        resetCreate()
        return
      }

      if (!createName.trim()) {
        setFormError("Укажите название")
        return
      }

      if (createType === "board") {
      const board = await createBoard(projectId, {
        name: createName.trim(),
        description: createDescription.trim(),
        parent_id: createParentId,
      })
        if (!board) throw new Error("board_create_failed")
        await refreshProject()
        resetCreate()
        navigate(`/teams/${teamLogin}/projects/${projectId}/boards/${board.id}`)
        return
      }

      const form = new URLSearchParams()
      form.append("name", createName.trim())
      form.append("description", createDescription.trim())
      form.append("project_id", projectId)
      if (createParentId) form.append("parent_id", createParentId)
      form.append("view_type", createType === "calendar" ? "calendar" : "kanban")
      const { data } = await api.post(
        `/main/task/createList/?team_login=${teamLogin}`,
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      if (!data.status || !data.data?.id) throw new Error(data?.error || "board_create_failed")
      await refreshProject()
      resetCreate()
      navigate(`/teams/${teamLogin}/projects/${projectId}/tasks/${data.data.id}`)
    } catch (error) {
      console.error("Failed to create project item:", error)
      setFormError("Не удалось создать объект")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-12 w-80" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
            Проекты
          </Link>
          <ChevronRight className="size-4" />
          <span>Проект не найден</span>
        </div>
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">Проект не найден или был удалён</p>
          <Button className="mt-4" onClick={() => navigate(`/teams/${teamLogin}/projects`)}>
            Вернуться к проектам
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6" onClick={() => setContextMenu(null)}>
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-muted">
              {project.img_url ? (
                <img src={project.img_url} alt={project.name} className="h-full w-full object-cover" />
              ) : (
                <SquareStack className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
                  Проекты
                </Link>
                <ChevronRight className="size-4" />
                <span className="font-medium text-foreground">{project.name}</span>
                {currentFolder && (
                  <>
                    <ChevronRight className="size-4" />
                    <span className="font-medium text-foreground">{currentFolder.title}</span>
                  </>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
              {project.description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/teams/${teamLogin}/projects/${project.id}/settings`)}>
              <Settings className="mr-2 size-4" />
              Настройки
            </Button>
            <Button onClick={() => openCreate(undefined, currentFolderId)}>
              <Plus className="mr-2 size-4" />
              Создать
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium">Объекты проекта</div>
            <div className="text-sm text-muted-foreground">
              {visibleItems.length} {visibleItems.length === 1 ? "объект" : visibleItems.length < 5 ? "объекта" : "объектов"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => setCurrentFolderId(null)}
              >
                {project.name}
              </button>
              {currentFolder && (
                <>
                  <ChevronRight className="size-4" />
                  <span className="font-medium text-foreground">{currentFolder.title}</span>
                </>
              )}
              {currentFolderId && (
                <button
                  type="button"
                  className="ml-2 rounded-full border px-3 py-1 text-xs hover:bg-muted"
                  onClick={() => setCurrentFolderId(null)}
                >
                  В корень
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Поиск по всем объектам..."
                className="pl-9"
              />
            </div>
            <Select value={boardSort} onValueChange={(value) => setBoardSort(value as BoardSort)}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">
                  <span className="flex items-center gap-2"><CalendarArrowDown className="size-4" /> Последние изменения</span>
                </SelectItem>
                <SelectItem value="updated_asc">
                  <span className="flex items-center gap-2"><CalendarArrowUp className="size-4" /> Сначала старые</span>
                </SelectItem>
                <SelectItem value="name_asc">
                  <span className="flex items-center gap-2"><ArrowUpAZ className="size-4" /> Название (А-Я)</span>
                </SelectItem>
                <SelectItem value="name_desc">
                  <span className="flex items-center gap-2"><ArrowUpZA className="size-4" /> Название (Я-А)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div
        className="min-h-[420px]"
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, parentId: currentFolderId })
        }}
      >
        {visibleItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {visibleItems.map((item) => {
              const Icon = getProjectItemIcon(item.type)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.type === "folder") {
                      setCurrentFolderId(item.id)
                      return
                    }
                    const href = getItemLink(item)
                    if (!href) return
                    if (item.type === "link") {
                      window.open(href, "_blank", "noreferrer")
                      return
                    }
                    navigate(href)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id, parentId: item.parent_id })
                  }}
                  className="group flex flex-col rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/40"
                  style={{ marginLeft: item.depth ? `${Math.min(item.depth, 3) * 8}px` : undefined }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {getItemKindLabel(item)}
                    </span>
                  </div>
                    <div className="mt-3 min-w-0 flex-1">
                    <div className="truncate font-medium">{item.title}</div>
                    {item.description ? (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    ) : null}
                    </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    {item.type === "folder" ? (
                      <span>{item.children.length} внутри</span>
                    ) : (
                      <span className="truncate">
                        {item.type === "link" ? "Ссылка" : "Открыть"}
                      </span>
                    )}
                    {item.type === "link" && getItemLink(item) && (
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1 text-[11px] font-medium hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(getItemLink(item), "_blank", "noreferrer")
                        }}
                      >
                        Перейти
                      </button>
                    )}
                    <span>{formatDate(item.updated_at)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center">
            <div className="max-w-md text-center text-muted-foreground">
              <FolderPlus className="mx-auto mb-3 size-10" />
              <p className="font-medium text-foreground">Пока нет объектов</p>
              <p className="mt-1 text-sm">
                Создайте папку, список задач, ссылку или доску, чтобы начать собирать структуру проекта.
              </p>
              <Button className="mt-4" onClick={() => openCreate(undefined, currentFolderId)}>
                <Plus className="mr-2 size-4" />
                Создать первый объект
              </Button>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[220px] rounded-2xl border bg-card p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {currentItem ? (
            <>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  if (currentItem.type === "folder") {
                    setCurrentFolderId(currentItem.id)
                  } else {
                    const href = getItemLink(currentItem)
                    if (href) {
                      if (currentItem.type === "link") {
                        window.open(href, "_blank", "noreferrer")
                      } else {
                        navigate(href)
                      }
                    }
                  }
                  setContextMenu(null)
                }}
              >
                <SquareStack className="size-4" />
                Открыть
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setRenameItemId(currentItem.project_item_id || currentItem.id)
                  setRenameValue(currentItem.title)
                  setRenameOpen(true)
                  setContextMenu(null)
                }}
              >
                <Pencil className="size-4" />
                Переименовать
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMoveItemId(currentItem.project_item_id || currentItem.id)
                  setMoveTargetParentId(currentItem.parent_id)
                  setMoveOpen(true)
                  setContextMenu(null)
                }}
              >
                <MoveRight className="size-4" />
                Переместить
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (window.confirm("Вы точно уверены?")) {
                    await deleteItem(currentItem.project_item_id || currentItem.id)
                    await refreshProject()
                  }
                  setContextMenu(null)
                }}
              >
                <Trash2 className="size-4" />
                Удалить
              </button>
            </>
          ) : (
            <>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("folder", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <FolderPlus className="size-4" />
                Создать папку
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("task_list", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <ListTodo className="size-4" />
                Создать список задач
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("link", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <Link2 className="size-4" />
                Создать ссылку
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("board", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <SquareStack className="size-4" />
                Создать доску
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("calendar", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <Calendar className="size-4" />
                Создать календарь
              </button>
            </>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : resetCreate())}>
        <DialogContent className={createType === "folder" ? "sm:max-w-[420px]" : "sm:max-w-[640px]"}>
          <DialogHeader>
            <DialogTitle>Создать объект</DialogTitle>
            <DialogDescription>
              {createType === "folder"
                ? "Введите название папки."
                : "Сначала выберите тип карточки, потом задайте название и параметры."}
            </DialogDescription>
          </DialogHeader>

          {createStep === "choose" && createType !== "folder" ? (
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              {[
                { type: "folder" as const, title: "Папка", icon: FolderPlus, description: "Группировка объектов" },
                { type: "task_list" as const, title: "Список задач", icon: ListTodo, description: "Обычный список или канбан" },
                { type: "link" as const, title: "Ссылка", icon: Link2, description: "Внешняя ссылка" },
                { type: "board" as const, title: "Доска", icon: SquareStack, description: "Excalidraw / whiteboard" },
                { type: "calendar" as const, title: "Календарь", icon: Calendar, description: "Список с календарным видом" },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    type="button"
                    className="flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40"
                    onClick={() => {
                      setCreateType(item.type)
                      setCreateStep("form")
                      setFormError("")
                    }}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Название *</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Введите название"
                  autoFocus
                />
              </div>
              {createType !== "folder" && createType !== "link" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Описание</label>
                  <Textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={3}
                    placeholder="Необязательно"
                  />
                </div>
              )}
              {createType === "link" && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">URL *</label>
                    <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Комментарий</label>
                    <Textarea value={linkComment} onChange={(e) => setLinkComment(e.target.value)} rows={3} placeholder="Необязательно" />
                  </div>
                </>
              )}
              {createParentId && (
                <div className="rounded-2xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Создание внутри папки: {folderItems.find((item) => item.id === createParentId)?.title || "папка"}
                </div>
              )}
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => (createStep === "choose" ? resetCreate() : setCreateStep("choose"))} disabled={submitting}>
              {createStep === "choose" ? "Отмена" : "Назад"}
            </Button>
            {createStep === "form" && (
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Создание..." : "Создать"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={(open) => { if (!open) setRenameOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!renameItemId || !renameValue.trim()) return
                await renameItem(renameItemId, renameValue.trim())
                await refreshProject()
                setRenameOpen(false)
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={(open) => { if (!open) setMoveOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить</DialogTitle>
            <DialogDescription>Выберите папку назначения или оставьте в корне.</DialogDescription>
          </DialogHeader>
          <Select value={moveTargetParentId || "__root__"} onValueChange={(value) => setMoveTargetParentId(value === "__root__" ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Куда переместить" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">Корень</SelectItem>
              {folderItems.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!moveItemId) return
                await moveItem(moveItemId, moveTargetParentId)
                await refreshProject()
                setMoveOpen(false)
              }}
            >
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
