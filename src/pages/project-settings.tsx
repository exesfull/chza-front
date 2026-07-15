import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Archive, ChevronRight, Image as ImageIcon, Loader2, Save, Settings, Search, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"
import { useTeams } from "@/hooks/use-teams"
import { useTeamMembers } from "@/hooks/use-team-members"

export function ProjectSettingsPage() {
  const { teamLogin, projectId } = useParams()
  const navigate = useNavigate()
  const { refreshTeams, fetchStorageUsage } = useTeams()
  const { getProject, updateProject, updateProjectMembers, uploadProjectImage, resetProjectImage, deleteProject } = useProjects(teamLogin, { autoLoad: false })
  const { members: teamMembers, loading: teamMembersLoading, refreshMembers } = useTeamMembers(teamLogin)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imgUrl, setImgUrl] = useState("")
  const [isArchived, setIsArchived] = useState(false)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")
  const [memberDraft, setMemberDraft] = useState<string[]>([])
  const [memberSaving, setMemberSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProject = async () => {
      if (!projectId) return
      const data = await getProject(projectId)
      if (cancelled) return

      setProject(data)
      if (data) {
        setName(data.name)
        setDescription(data.description || "")
        setImgUrl(data.img_url || "")
        setIsArchived(data.is_archived)
        setImageLoaded(false)
      }
    }

    loadProject()
    return () => {
      cancelled = true
    }
  }, [getProject, projectId])

  useEffect(() => {
    document.title = project?.name ? `${project.name} • Настройки` : "Настройки проекта"
  }, [project])

  useEffect(() => {
    if (!project?.members) return
    setMemberDraft(project.members.map((member) => member.id))
  }, [project?.members])

  const handleSave = async () => {
    if (!projectId) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Название проекта обязательно")
      return
    }

    setSaving(true)
    setError("")
    setSaveSuccess(false)

    try {
      const updated = await updateProject(projectId, {
        name: trimmedName,
        description: description.trim(),
        img_url: imgUrl.trim(),
        is_archived: isArchived,
      })

      if (!updated) {
        setError("Не удалось сохранить проект")
        return
      }

      setProject((prev) => prev ? { ...prev, ...updated } : updated as ProjectDetail)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (saveError) {
      console.error("Failed to save project:", saveError)
      setError("Не удалось сохранить проект")
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file?: File) => {
    if (!projectId || !file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Изображение должно быть не больше 5 МБ")
      return
    }

    try {
      const updated = await uploadProjectImage(projectId, file)
      if (updated) {
        setProject((prev) => prev ? { ...prev, img_url: updated.img_url } : prev)
        setImgUrl(updated.img_url || "")
        setImageLoaded(false)
        if (teamLogin) {
          await Promise.all([refreshTeams(), fetchStorageUsage(teamLogin)])
        }
      }
    } catch (uploadError) {
      console.error("Failed to upload project image:", uploadError)
      setError("Не удалось загрузить изображение")
    }
  }

  const handleResetImage = async () => {
    if (!projectId) return
    try {
      const updated = await resetProjectImage(projectId)
      if (updated) {
        setProject((prev) => prev ? { ...prev, img_url: updated.img_url } : prev)
        setImgUrl(updated.img_url || "")
        setImageLoaded(false)
        if (teamLogin) {
          await Promise.all([refreshTeams(), fetchStorageUsage(teamLogin)])
        }
      }
    } catch (resetError) {
      console.error("Failed to reset project image:", resetError)
      setError("Не удалось сбросить изображение")
    }
  }

  const handleDelete = async () => {
    if (!projectId) return
    const ok = await deleteProject(projectId)
    if (ok && teamLogin) {
      navigate(`/teams/${teamLogin}/projects`)
    }
  }

  const openMembersModal = () => {
    setMemberSearch("")
    setMemberDraft(project?.members?.map((member) => member.id) || [])
    setMemberModalOpen(true)
  }

  const handleSaveMembers = async () => {
    if (!projectId) return
    setMemberSaving(true)
    try {
      const updated = await updateProjectMembers(projectId, memberDraft)
      if (updated) {
        setProject(updated)
        setMemberModalOpen(false)
        if (teamLogin) {
          await Promise.all([refreshTeams(), fetchStorageUsage(teamLogin), refreshMembers()])
        }
      } else {
        setError("Не удалось сохранить участников")
      }
    } catch (saveError) {
      console.error("Failed to save members:", saveError)
      setError("Не удалось сохранить участников")
    } finally {
      setMemberSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId) return
    const nextIds = (project?.members || []).filter((member) => member.id !== memberId).map((member) => member.id)
    const updated = await updateProjectMembers(projectId, nextIds)
    if (updated) {
      setProject(updated)
      if (teamLogin) {
        await Promise.all([refreshTeams(), fetchStorageUsage(teamLogin), refreshMembers()])
      }
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">Проекты</Link>
          <ChevronRight className="size-4" />
          <span>Загрузка...</span>
        </div>
        <div className="rounded-2xl border p-8 text-center text-muted-foreground">Загрузка проекта...</div>
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
        <Link to={`/teams/${teamLogin}/projects/${projectId}`} className="hover:text-foreground">
          {project.name}
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground font-medium">Настройки</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки проекта</h1>
          <p className="text-sm text-muted-foreground">Управление параметрами проекта</p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="text-sm text-green-600">Сохранено!</span>}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.85fr)]">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Основные</h2>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Обложка проекта</label>
            <div className="relative h-40 overflow-hidden rounded-xl border bg-muted/20">
              {!imageLoaded && imgUrl && <Skeleton className="absolute inset-0" />}
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(false)}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              void handleImageUpload(e.target.files?.[0])
              e.target.value = ""
            }} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="mr-2 size-4" />
                Изменить
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleResetImage()}>
                <Trash2 className="mr-2 size-4" />
                Сбросить
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Название *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isArchived}
              onChange={(e) => setIsArchived(e.target.checked)}
            />
            Архивировать проект
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Участники проекта</h2>
              </div>
              <Button variant="outline" size="sm" onClick={openMembersModal}>
                <UserPlus className="mr-2 size-4" />
                Добавить
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {(project?.members || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока нет участников</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(project?.members || []).map((member) => {
                    const initials = `${member.last_name?.[0] || ""}${member.first_name?.[0] || ""}`.toUpperCase() || "?"
                    const isCreator = project?.created_by === member.id
                    return (
                      <div key={member.id} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                        <Avatar className="size-9">
                          <AvatarImage src={member.img_url || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {[member.last_name, member.first_name].filter(Boolean).join(" ") || member.email}
                            </p>
                            {member.is_admin && (
                              <Badge variant="secondary" className="gap-1">
                                <ShieldCheck className="size-3" />
                                Админ
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isCreator}
                          onClick={() => void handleRemoveMember(member.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-destructive/30 bg-card p-6">
            <div className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <h2 className="text-lg font-semibold text-destructive">Опасная зона</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Удаление проекта необратимо. Все данные проекта будут помечены как удалённые.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Archive className="mr-2 size-4" />
                {isArchived ? "Сохранить архив" : "Архивировать"}
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                Удалить проект
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Добавить участников проекта</DialogTitle>
            <DialogDescription>Нажмите на карточки пользователей, чтобы добавить или убрать их из проекта.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по ФИО или почте"
                className="pl-9"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            <div className="grid max-h-[50vh] gap-2 overflow-auto rounded-xl border p-2">
              {teamMembersLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Загрузка пользователей...</div>
              ) : (
                teamMembers
                  .filter((member) => {
                    const fullName = `${member.last_name} ${member.first_name} ${member.email}`.toLowerCase()
                    return fullName.includes(memberSearch.toLowerCase())
                  })
                  .map((member) => {
                    const checked = memberDraft.includes(member.id)
                    const initials = `${member.last_name?.[0] || ""}${member.first_name?.[0] || ""}`.toUpperCase() || "?"
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => {
                          setMemberDraft((prev) =>
                            prev.includes(member.id)
                              ? prev.filter((id) => id !== member.id)
                              : [...prev, member.id]
                          )
                        }}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-muted/40"
                      >
                        <Checkbox checked={checked} />
                        <Avatar className="size-9">
                          <AvatarImage src={member.img_url || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {[member.last_name, member.first_name].filter(Boolean).join(" ") || member.email}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </button>
                    )
                  })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleSaveMembers()} disabled={memberSaving}>
              {memberSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить участников"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Проект «{project.name}» будет скрыт из списка. Это действие можно будет вернуть только из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
