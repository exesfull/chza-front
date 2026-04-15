import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Settings,
  Plus,
  ListTodo,
  StickyNote,
  Link2,
  Calendar,
  ClipboardList,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ResourceType = "taskList" | "note" | "link" | "calendar" | "survey"

interface ResourceTypeOption {
  type: ResourceType
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const resourceTypes: ResourceTypeOption[] = [
  { type: "taskList", title: "Список задач", description: "Канбан или таблица задач", icon: ListTodo, color: "bg-blue-500/10 text-blue-600" },
  { type: "note", title: "Заметки", description: "Текстовые заметки", icon: StickyNote, color: "bg-yellow-500/10 text-yellow-600" },
  { type: "link", title: "Ссылки", description: "Полезные ссылки", icon: Link2, color: "bg-green-500/10 text-green-600" },
  { type: "calendar", title: "Календарь", description: "События и дедлайны", icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
  { type: "survey", title: "Анкета", description: "Опросы и формы", icon: ClipboardList, color: "bg-orange-500/10 text-orange-600" },
]

interface ResourceItem {
  id: string
  type: ResourceType
  name: string
  lastUpdated: string
}

const sampleResources: ResourceItem[] = [
  { id: "1", type: "taskList", name: "Бэклог спринта", lastUpdated: "2026-04-07T15:30:00" },
  { id: "2", type: "taskList", name: "Баги", lastUpdated: "2026-04-06T10:00:00" },
  { id: "3", type: "note", name: "Meeting notes", lastUpdated: "2026-04-05T14:00:00" },
  { id: "4", type: "link", name: "Документация API", lastUpdated: "2026-04-04T09:00:00" },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function ProjectPage() {
  const { teamLogin, projectId } = useParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [resources] = useState<ResourceItem[]>(sampleResources)

  useEffect(() => {
    document.title = `Проект: ${projectId || ""}`
  }, [projectId])

  const groupedResources = resourceTypes.map((rt) => ({
    ...rt,
    items: resources.filter((r) => r.type === rt.type),
  }))

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
          Проекты
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground font-medium">Разработка сайта</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Разработка сайта</h1>
          <p className="text-sm text-muted-foreground">Создание корпоративного сайта с нуля</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 size-4" />
                Настройки
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/teams/${teamLogin}/projects/${projectId}/settings`}>
                  Настройки проекта
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Переименовать</DropdownMenuItem>
              <DropdownMenuItem>Изменить описание</DropdownMenuItem>
              <DropdownMenuItem>Участники</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Удалить проект</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Создать
          </Button>
        </div>
      </div>

      {/* Resource types grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groupedResources.map((group) => (
          <div key={group.type} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("flex size-10 items-center justify-center rounded-lg", group.color)}>
                <group.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">{group.title}</h3>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </div>
            </div>
            {group.items.length > 0 ? (
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDate(item.lastUpdated)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Пока пусто</p>
            )}
          </div>
        ))}
      </div>

      {/* Create resource dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Создать ресурс</DialogTitle>
            <DialogDescription>Выберите тип ресурса для проекта</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {resourceTypes.map((rt) => (
              <button
                key={rt.type}
                onClick={() => setCreateOpen(false)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
              >
                <div className={cn("flex size-10 items-center justify-center rounded-lg", rt.color)}>
                  <rt.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{rt.title}</p>
                  <p className="text-xs text-muted-foreground">{rt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
