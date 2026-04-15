import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Search, Plus, MoreHorizontal, Calendar, Users, ListTodo, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProjectCard {
  id: string
  name: string
  description: string
  image: string
  taskLists: number
  members: string[]
  lastUpdated: string
}

const sampleProjects: ProjectCard[] = [
  {
    id: "1",
    name: "Разработка сайта",
    description: "Создание корпоративного сайта с нуля",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
    taskLists: 5,
    members: ["Алексей", "Мария", "Дмитрий"],
    lastUpdated: "2026-04-07T15:30:00",
  },
  {
    id: "2",
    name: "Мобильное приложение",
    description: "Приложение для iOS и Android",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop",
    taskLists: 3,
    members: ["Елена", "Иван"],
    lastUpdated: "2026-04-06T10:00:00",
  },
  {
    id: "3",
    name: "Маркетинг Q2",
    description: "Маркетинговая стратегия на второй квартал",
    image: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=200&fit=crop",
    taskLists: 8,
    members: ["Ольга", "Сергей", "Анна", "Павел"],
    lastUpdated: "2026-04-08T09:15:00",
  },
  {
    id: "4",
    name: "Редизайн Dashboard",
    description: "Обновление интерфейса панели управления",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
    taskLists: 4,
    members: ["Алексей", "Мария"],
    lastUpdated: "2026-04-05T18:45:00",
  },
  {
    id: "5",
    name: "API Интеграция",
    description: "Интеграция с внешними сервисами",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop",
    taskLists: 2,
    members: ["Дмитрий"],
    lastUpdated: "2026-04-08T12:00:00",
  },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Только что"
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffDays === 1) return "Вчера"
  if (diffDays < 7) return `${diffDays} дн. назад`
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

// Sample team members
const teamMembers = [
  { id: "1", name: "Алексей Иванов", email: "alexey@example.com" },
  { id: "2", name: "Мария Петрова", email: "maria@example.com" },
  { id: "3", name: "Дмитрий Сидоров", email: "dmitry@example.com" },
  { id: "4", name: "Елена Козлова", email: "elena@example.com" },
  { id: "5", name: "Иван Смирнов", email: "ivan@example.com" },
  { id: "6", name: "Ольга Новикова", email: "olga@example.com" },
  { id: "7", name: "Сергей Волков", email: "sergey@example.com" },
  { id: "8", name: "Анна Соколова", email: "anna@example.com" },
]

export function ProjectsPage() {
  const [search, setSearch] = useState("")
  const [projects] = useState<ProjectCard[]>(sampleProjects)
  const [createOpen, setCreateOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDesc, setNewProjectDesc] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState("")

  useEffect(() => {
    document.title = "Проекты"
  }, [])

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleCreateProject = () => {
    // TODO: API call
    setCreateOpen(false)
    setNewProjectName("")
    setNewProjectDesc("")
    setSelectedMembers([])
    setMemberSearch("")
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Проекты</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? "проект" : projects.length < 5 ? "проекта" : "проектов"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Создать проект
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск проектов..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <Link
            key={project.id}
            to={`/teams/test/projects/${project.id}`}
            className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer"
          >
            {/* Card body with background image */}
            <div className="relative h-36 overflow-hidden">
              <img
                src={project.image}
                alt={project.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Frosted glass overlay for title */}
              <div className="absolute left-3 top-3 rounded-lg px-3 py-1.5 backdrop-blur-md bg-white/30 dark:bg-black/40">
                <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
              </div>
              {/* Three-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/40">
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Открыть</DropdownMenuItem>
                  <DropdownMenuItem>Настройки</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Удалить</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description area below image */}
            <div className="px-4 py-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
            </div>

            {/* Footer with badges */}
            <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <ListTodo className="size-3" />
                {project.taskLists}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Users className="size-3" />
                {project.members.length}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs ml-auto">
                <Calendar className="size-3" />
                {formatDate(project.lastUpdated)}
              </Badge>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Search className="mb-2 size-8 opacity-50" />
          <p>Ничего не найдено</p>
        </div>
      )}

      {/* Create project dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setNewProjectName(""); setNewProjectDesc(""); setSelectedMembers([]); setMemberSearch("") } }}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать проект</DialogTitle>
            <DialogDescription>Заполните информацию о новом проекте</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input
                placeholder="Название проекта"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
            </div>
            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                placeholder="Описание проекта"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={3}
              />
            </div>
            {/* Members */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Участники</label>
              <Input
                placeholder="Поиск участников..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-8 text-sm"
              />
              {/* Selected members badges */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
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
              {/* Members list */}
              <div className="max-h-40 overflow-y-auto rounded-md border">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setNewProjectName(""); setNewProjectDesc(""); setSelectedMembers([]); setMemberSearch("") }}>Отмена</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
