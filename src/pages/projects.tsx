import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Calendar, Image as ImageIcon, Link2, ListTodo, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjects } from "@/hooks/use-projects"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Только что"
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffDays === 1) return "Вчера"
  if (diffDays < 7) return `${diffDays} дн. назад`
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

export function ProjectsPage() {
  const { teamLogin } = useParams()
  const navigate = useNavigate()
  const { projects, loading, createProject } = useProjects(teamLogin)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imgUrl, setImgUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = "Проекты"
  }, [])

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name} ${project.description || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [projects, search]
  )

  const openProject = (projectId: string) => {
    if (!teamLogin) return
    navigate(`/teams/${teamLogin}/projects/${projectId}`)
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Название проекта обязательно")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const project = await createProject({
        name: trimmedName,
        description: description.trim(),
        img_url: imgUrl.trim(),
      })

      if (!project) {
        setError("Не удалось создать проект")
        return
      }

      setCreateOpen(false)
      setName("")
      setDescription("")
      setImgUrl("")
      if (teamLogin) {
        navigate(`/teams/${teamLogin}/projects/${project.id}`)
      }
    } catch (createError) {
      console.error("Failed to create project:", createError)
      setError("Не удалось создать проект")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Проекты</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Загрузка..." : `${projects.length} ${projects.length === 1 ? "проект" : projects.length < 5 ? "проекта" : "проектов"}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Создать проект
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск проектов..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border bg-muted/30" />
          ))
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.id)}
              className="group overflow-hidden rounded-2xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-40 overflow-hidden bg-muted">
                {project.img_url ? (
                  <img
                    src={project.img_url}
                    alt={project.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <ImageIcon className="size-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h3 className="line-clamp-1 text-lg font-semibold text-white">{project.name}</h3>
                  <p className="line-clamp-2 text-sm text-white/80">
                    {project.description || "Без описания"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListTodo className="size-4" />
                  {project.task_lists_count}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 className="size-4" />
                  {project.links_count}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <Calendar className="size-4" />
                  {formatDate(project.updated_at)}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <ImageIcon className="mx-auto mb-3 size-10" />
            <p>Пока нет проектов</p>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Создать проект</DialogTitle>
            <DialogDescription>Заполните информацию о новом проекте</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input
                placeholder="Название проекта"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                placeholder="Описание проекта"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Обложка</label>
              <Input
                placeholder="URL изображения"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
              {submitting ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
