import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowUpAZ,
  ArrowUpZA,
  Calendar,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  ListTodo,
  Plus,
  Search,
  Settings,
  SquareStack,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"

type ResourceType = "board" | "calendar" | "link"
type BoardSort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}

function getBoardIcon(viewType?: string) {
  if (viewType === "calendar") return Calendar
  if (viewType === "table") return LayoutGrid
  return ListTodo
}

export function ProjectPage() {
  const { teamLogin, projectId } = useParams()
  const navigate = useNavigate()
  const { getProject } = useProjects(teamLogin, { autoLoad: false })
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardSearch, setBoardSearch] = useState("")
  const [boardSort, setBoardSort] = useState<BoardSort>("updated_desc")
  const [addOpen, setAddOpen] = useState(false)
  const [resourceType, setResourceType] = useState<ResourceType>("board")
  const [boardName, setBoardName] = useState("")
  const [boardDescription, setBoardDescription] = useState("")
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkComment, setLinkComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

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

  const boards = useMemo(() => {
    const items = project?.task_lists ?? []
    const filtered = items.filter((item) =>
      `${item.name} ${item.description || ""}`.toLowerCase().includes(boardSearch.toLowerCase())
    )

    const sorted = [...filtered]
    switch (boardSort) {
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"))
        break
      case "name_desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name, "ru"))
        break
      case "updated_asc":
        sorted.sort((a, b) => new Date((a.updated_at || "").replace(" ", "T")).getTime() - new Date((b.updated_at || "").replace(" ", "T")).getTime())
        break
      default:
        sorted.sort((a, b) => new Date((b.updated_at || "").replace(" ", "T")).getTime() - new Date((a.updated_at || "").replace(" ", "T")).getTime())
        break
    }

    return sorted
  }, [project?.task_lists, boardSearch, boardSort])

  const links = project?.links ?? []

  const resetDialog = () => {
    setAddOpen(false)
    setFormError("")
    setSubmitting(false)
  }

  const handleCreateResource = async () => {
    if (!teamLogin || !projectId) return
    setSubmitting(true)
    setFormError("")

    try {
      if (resourceType === "link") {
        if (!linkTitle.trim() || !linkUrl.trim()) {
          setFormError("Укажите название и URL ссылки")
          return
        }

        const form = new URLSearchParams()
        form.append("title", linkTitle.trim())
        form.append("url", linkUrl.trim())
        if (linkComment.trim()) form.append("comment", linkComment.trim())

        const { data } = await api.post(
          `/main/links/create/?team_login=${teamLogin}&project_id=${projectId}`,
          form,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )

        if (!data.status) {
          throw new Error(data?.error || "link_create_failed")
        }

        await refreshProject()
        resetDialog()
        return
      }

      if (!boardName.trim()) {
        setFormError("Укажите название доски")
        return
      }

      const form = new URLSearchParams()
      form.append("name", boardName.trim())
      form.append("description", boardDescription.trim())
      form.append("project_id", projectId)
      form.append("view_type", resourceType === "calendar" ? "calendar" : "kanban")

      const { data } = await api.post(
        `/main/task/createList/?team_login=${teamLogin}`,
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      if (!data.status || !data.data?.id) {
        throw new Error(data?.error || "board_create_failed")
      }

      await refreshProject()
      resetDialog()
      navigate(`/teams/${teamLogin}/tasks/${data.data.id}?project_id=${projectId}`)
    } catch (error) {
      console.error("Failed to create project resource:", error)
      setFormError("Не удалось создать объект")
      setSubmitting(false)
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
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
          Проекты
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-muted">
            {project.img_url ? (
              <img src={project.img_url} alt={project.name} className="h-full w-full object-cover" />
            ) : (
              <SquareStack className="size-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {project.description || "Описание проекта не указано"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/teams/${teamLogin}/projects/${project.id}/settings`)}>
            <Settings className="mr-2 size-4" />
            Настройки
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 size-4" />
            Добавить
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Доски задач</h2>
              <p className="text-sm text-muted-foreground">{boards.length} элементов</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  placeholder="Поиск досок..."
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

          <div className="max-h-[420px] overflow-y-auto pr-1">
            {boards.length > 0 ? (
              <div className="grid gap-3">
                {boards.map((item) => {
                  const Icon = getBoardIcon(item.view_type)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/teams/${teamLogin}/tasks/${item.id}?project_id=${projectId}`)}
                      className="flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{item.name}</span>
                          {item.view_type && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {item.view_type}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{item.description || "Без описания"}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>{formatDate(item.updated_at)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                <ImageIcon className="mx-auto mb-3 size-10" />
                <p>Пока нет досок задач</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ссылки</h2>
              <p className="text-sm text-muted-foreground">{links.length} элементов</p>
            </div>
            <Link2 className="size-5 text-muted-foreground" />
          </div>

          <div className="grid gap-2">
            {links.length > 0 ? (
              links.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.comment || item.url}</p>
                  </div>
                </a>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Пока нет связанных ссылок
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Обновлено: {formatDate(project.updated_at)}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Добавить объект в проект</DialogTitle>
            <DialogDescription>Создайте доску задач, календарь или ссылку внутри этого проекта</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Тип объекта</label>
              <Select value={resourceType} onValueChange={(value) => setResourceType(value as ResourceType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Доска задач</SelectItem>
                  <SelectItem value="calendar">Календарь</SelectItem>
                  <SelectItem value="link">Ссылка</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resourceType === "link" ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Название *</label>
                  <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Название ссылки" autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">URL *</label>
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Комментарий</label>
                  <Textarea value={linkComment} onChange={(e) => setLinkComment(e.target.value)} rows={3} placeholder="Необязательно" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Название *</label>
                  <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} placeholder={resourceType === "calendar" ? "Название календаря" : "Название доски"} autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Описание</label>
                  <Textarea value={boardDescription} onChange={(e) => setBoardDescription(e.target.value)} rows={3} placeholder="Необязательно" />
                </div>
              </>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={handleCreateResource} disabled={submitting}>
              {submitting ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
