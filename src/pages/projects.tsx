import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Calendar, Image as ImageIcon, Link2, ListTodo, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjects } from "@/hooks/use-projects"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useUser } from "@/hooks/use-user"

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
  const { members, loading: membersLoading } = useTeamMembers(teamLogin)
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = "Проекты"
  }, [])

  useEffect(() => {
    if (!createOpen) {
      return
    }

    const creatorId = user?.id
    setSelectedMembers(creatorId ? [creatorId] : [])
  }, [createOpen, user])

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
        member_ids: JSON.stringify(selectedMembers.length > 0 ? selectedMembers : user?.id ? [user.id] : []),
      })

      if (!project) {
        setError("Не удалось создать проект")
        return
      }

      setCreateOpen(false)
      setName("")
      setDescription("")
      setSelectedMembers(user?.id ? [user.id] : [])
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
              <label className="text-sm font-medium">Участники проекта</label>
              <div className="grid gap-2 max-h-64 overflow-y-auto rounded-xl border p-2">
                {membersLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Загрузка участников...</div>
                ) : members.length > 0 ? (
                  members.map((member) => {
                    const fullName = `${member.last_name} ${member.first_name}`.trim()
                    const isCreator = member.id === user?.id
                    const checked = selectedMembers.includes(member.id)

                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={isCreator}
                          onCheckedChange={(value) => {
                            const nextChecked = Boolean(value)
                            setSelectedMembers((current) => {
                              if (isCreator) {
                                return current.includes(member.id) ? current : [...current, member.id]
                              }
                              if (nextChecked) {
                                return current.includes(member.id) ? current : [...current, member.id]
                              }
                              return current.filter((id) => id !== member.id)
                            })
                          }}
                        />
                        <Avatar className="size-9 rounded-lg">
                          <AvatarImage src={member.img_url} alt={fullName} />
                          <AvatarFallback className="rounded-lg text-xs">
                            {fullName.slice(0, 2).toUpperCase() || "П"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{fullName || "Пользователь"}</span>
                            {isCreator && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                Глава
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </label>
                    )
                  })
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">В команде пока нет участников</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Глава проекта назначается автоматически на создателя. Остальных участников можно выбрать здесь.
              </p>
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
