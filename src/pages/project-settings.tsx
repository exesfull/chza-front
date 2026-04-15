import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Settings,
  ChevronRight,
  Users,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
  Archive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const teamMembers = [
  { id: "1", name: "Алексей Иванов", email: "alexey@example.com" },
  { id: "2", name: "Мария Петрова", email: "maria@example.com" },
  { id: "3", name: "Дмитрий Сидоров", email: "dmitry@example.com" },
  { id: "4", name: "Елена Козлова", email: "elena@example.com" },
  { id: "5", name: "Иван Смирнов", email: "ivan@example.com" },
]

const currentMembers = ["1", "2", "3"]

export function ProjectSettingsPage() {
  const { teamLogin, projectId } = useParams()
  const [projectName, setProjectName] = useState("Разработка сайта")
  const [projectDesc, setProjectDesc] = useState("Создание корпоративного сайта с нуля")
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop")
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentMembers)
  const [memberSearch, setMemberSearch] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    document.title = "Настройки проекта"
  }, [])

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    // TODO: API call
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
          Проекты
        </Link>
        <ChevronRight className="size-4" />
        <Link to={`/teams/${teamLogin}/projects/${projectId}`} className="hover:text-foreground">
          Разработка сайта
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground font-medium">Настройки</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки проекта</h1>
          <p className="text-sm text-muted-foreground">Управление параметрами проекта</p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-600">Сохранено!</span>
          )}
          <Button onClick={handleSave}>
            <Save className="mr-2 size-4" />
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General settings */}
        <div className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Основные</h2>
          </div>

          {/* Cover image */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Обложка проекта</label>
            <div className="relative h-36 overflow-hidden rounded-lg border bg-muted/30">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="size-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <Input
              placeholder="URL изображения"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Название *</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Members */}
        <div className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Участники</h2>
          </div>

          {/* Selected members */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map((id) => {
                const member = teamMembers.find((m) => m.id === id)
                if (!member) return null
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-1">
                    {member.name}
                    <button onClick={() => toggleMember(id)} className="ml-0.5 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Search */}
          <Input
            placeholder="Поиск участников..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />

          {/* Members list */}
          <div className="max-h-60 overflow-y-auto rounded-md border">
            {filteredMembers.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selectedMembers.includes(member.id)}
                  onCheckedChange={() => toggleMember(member.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </label>
            ))}
            {filteredMembers.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Не найдено</p>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="flex flex-col gap-4 rounded-xl border border-destructive/30 p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">Опасная зона</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Удаление проекта необратимо. Все данные проекта, включая задачи, заметки и ссылки, будут потеряны.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Archive className="mr-2 size-4" />
            Архивировать проект
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            Удалить проект
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Проект «{projectName}» и все его данные будут удалены безвозвратно. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
