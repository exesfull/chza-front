import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronRight, Link2, ListTodo, Settings, SquareStack } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function ProjectPage() {
  const { teamLogin, projectId } = useParams()
  const navigate = useNavigate()
  const { getProject } = useProjects(teamLogin)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

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

  const taskLists = project.task_lists ?? []
  const links = project.links ?? []

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
          <Button onClick={() => navigate(`/teams/${teamLogin}/tasks`)}>
            <ListTodo className="mr-2 size-4" />
            К задачам
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Списки задач</h2>
              <p className="text-sm text-muted-foreground">{taskLists.length} элементов</p>
            </div>
            <ListTodo className="size-5 text-muted-foreground" />
          </div>
          {taskLists.length > 0 ? (
            <div className="flex flex-col gap-2">
              {taskLists.map((item) => (
                <Link
                  key={item.id}
                  to={`/teams/${teamLogin}/tasks/${item.id}`}
                  className="rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description || "Без описания"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Пока нет связанных списков задач
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ссылки</h2>
              <p className="text-sm text-muted-foreground">{links.length} элементов</p>
            </div>
            <Link2 className="size-5 text-muted-foreground" />
          </div>
          {links.length > 0 ? (
            <div className="flex flex-col gap-2">
              {links.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.comment || item.url}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Пока нет связанных ссылок
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Обновлено: {formatDate(project.updated_at)}
      </div>
    </div>
  )
}
