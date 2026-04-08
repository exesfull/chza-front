import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Search,
  Filter,
  Plus,
} from "lucide-react"

interface LinkItem {
  id: number
  title: string
  url: string
  group: string
}

const initialLinks: LinkItem[] = [
  { id: 1, title: "Google", url: "https://google.com", group: "Поисковики" },
  { id: 2, title: "GitHub", url: "https://github.com", group: "Разработка" },
  { id: 3, title: "Stack Overflow", url: "https://stackoverflow.com", group: "Разработка" },
  { id: 4, title: "YouTube", url: "https://youtube.com", group: "Видео" },
  { id: 5, title: "Habr", url: "https://habr.com", group: "Блоги" },
  { id: 6, title: "MDN Web Docs", url: "https://developer.mozilla.org", group: "Документация" },
]

const groups = ["Все", ...Array.from(new Set(initialLinks.map((l) => l.group)))]

export function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks)
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("Все")

  useEffect(() => {
    document.title = "Ссылки"
  }, [])

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.title.toLowerCase().includes(search.toLowerCase()) ||
      link.url.toLowerCase().includes(search.toLowerCase())
    const matchesGroup = selectedGroup === "Все" || link.group === selectedGroup
    return matchesSearch && matchesGroup
  })

  const handleDelete = (id: number) => {
    setLinks(links.filter((l) => l.id !== id))
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ссылки</h1>
          <p className="text-sm text-muted-foreground">
            Управление полезными ссылками
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Добавить ссылку
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск ссылок..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Фильтр по группе"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-48 pl-9 sm:w-56"
            list="groups-list"
          />
          <datalist id="groups-list">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Links Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLinks.map((link) => (
          <Card key={link.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <Badge variant="outline" className="w-fit text-xs">
                    {link.group}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 size-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy(link.url)}>
                      <Copy className="mr-2 size-4" />
                      Копировать ссылку
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 truncate text-sm text-muted-foreground">
                {link.url}
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 size-4" />
                  Перейти
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Ничего не найдено</h3>
          <p className="text-sm text-muted-foreground">
            Попробуйте изменить параметры поиска
          </p>
        </div>
      )}
    </div>
  )
}
