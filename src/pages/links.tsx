import { useState, useEffect, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Search,
  Plus,
  Tags,
  Globe,
  X,
  Check,
  CopyCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LinkItem {
  id: string
  title: string
  url: string
  tags: string[]
  favicon?: string
}

interface Tag {
  id: string
  name: string
  color: string
}

const TAG_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-red-500", "bg-yellow-500",
  "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
  "bg-teal-500", "bg-cyan-500",
]

const initialTags: Tag[] = [
  { id: "1", name: "Разработка", color: "bg-blue-500" },
  { id: "2", name: "Документация", color: "bg-green-500" },
  { id: "3", name: "Дизайн", color: "bg-purple-500" },
  { id: "4", name: "Соцсети", color: "bg-pink-500" },
  { id: "5", name: "Новости", color: "bg-orange-500" },
  { id: "6", name: "Обучение", color: "bg-indigo-500" },
]

const initialLinks: LinkItem[] = [
  { id: "1", title: "GitHub", url: "https://github.com", tags: ["1"], favicon: "https://github.com/favicon.ico" },
  { id: "2", title: "Stack Overflow", url: "https://stackoverflow.com", tags: ["1"], favicon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
  { id: "3", title: "MDN Web Docs", url: "https://developer.mozilla.org", tags: ["2"], favicon: "https://developer.mozilla.org/favicon-48x48.png" },
  { id: "4", title: "Figma", url: "https://figma.com", tags: ["3"], favicon: "https://static.figma.com/app/icon/1/favicon.png" },
  { id: "5", title: "Habr", url: "https://habr.com", tags: ["5", "1"], favicon: "https://habr.com/favicon.ico" },
  { id: "6", title: "YouTube", url: "https://youtube.com", tags: ["6"], favicon: "https://www.youtube.com/s/desktop/favicon.ico" },
]

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace("www.", "")
  } catch {
    return url
  }
}

function LinkFavicon({ favicon }: { favicon?: string }) {
  const [error, setError] = useState(false)
  if (favicon && !error) {
    return (
      <img
        src={favicon}
        alt=""
        className="size-5 rounded-sm"
        onError={() => setError(true)}
      />
    )
  }
  return <Globe className="size-4 text-muted-foreground" />
}

export function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [search, setSearch] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)

  // Tag management
  const [tagManageOpen, setTagManageOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  // Form states
  const [formTitle, setFormTitle] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formTags, setFormTags] = useState<string[]>([])
  const [formFavicon, setFormFavicon] = useState("")

  useEffect(() => {
    document.title = "Ссылки"
  }, [])

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch =
        link.title.toLowerCase().includes(search.toLowerCase()) ||
        link.url.toLowerCase().includes(search.toLowerCase())
      const matchesTag = selectedTagIds.length === 0 || selectedTagIds.some((t) => link.tags.includes(t))
      return matchesSearch && matchesTag
    })
  }, [links, search, selectedTagIds])

  const handleCopy = useCallback(async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleDelete = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  const openEdit = (link: LinkItem) => {
    setEditingLink(link)
    setFormTitle(link.title)
    setFormUrl(link.url)
    setFormTags(link.tags)
    setFormFavicon(link.favicon || "")
    setCreateOpen(true)
  }

  const openCreate = () => {
    setEditingLink(null)
    setFormTitle("")
    setFormUrl("")
    setFormTags([])
    setFormFavicon("")
    setCreateOpen(true)
  }

  const saveLink = () => {
    if (!formTitle.trim() || !formUrl.trim()) return
    if (editingLink) {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === editingLink.id
            ? { ...l, title: formTitle.trim(), url: formUrl.trim(), tags: formTags, favicon: formFavicon || undefined }
            : l
        )
      )
      setCreateOpen(false)
    } else {
      const newLink: LinkItem = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        url: formUrl.trim(),
        tags: formTags,
        favicon: formFavicon || undefined,
      }
      setLinks((prev) => [newLink, ...prev])
      setCreateOpen(false)
    }
  }

  const saveTags = () => {
    if (editingLink) {
      setLinks((prev) =>
        prev.map((l) => (l.id === editingLink.id ? { ...l, tags: formTags } : l))
      )
      setEditingLink((prev) => (prev ? { ...prev, tags: formTags } : null))
    }
    setTagsOpen(false)
  }

  const addTag = () => {
    if (!newTagName.trim()) return
    const color = TAG_COLORS[tags.length % TAG_COLORS.length]
    const newTag: Tag = { id: Date.now().toString(), name: newTagName.trim(), color }
    setTags((prev) => [...prev, newTag])
    setNewTagName("")
  }

  const removeTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id))
    setLinks((prev) => prev.map((l) => ({ ...l, tags: l.tags.filter((t) => t !== id) })))
    setSelectedTagIds((prev) => prev.filter((t) => t !== id))
  }

  const toggleFilterTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const toggleFormTag = (id: string) => {
    setFormTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  // Dialog form (shared between create and edit)
  const LinkFormDialog = ({ open, onOpenChange, title }: { open: boolean; onOpenChange: (v: boolean) => void; title: string }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Заполните информацию о ссылке</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Название *</label>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Название ссылки" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">URL *</label>
            <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">URL фавиконки</label>
            <Input value={formFavicon} onChange={(e) => setFormFavicon(e.target.value)} placeholder="https://example.com/favicon.ico" />
            {formFavicon && (
              <div className="flex items-center gap-2 mt-1">
                <LinkFavicon favicon={formFavicon} />
                <span className="text-xs text-muted-foreground">Превью</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Теги</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleFormTag(tag.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white transition-opacity",
                    tag.color,
                    !formTags.includes(tag.id) && "opacity-40"
                  )}
                >
                  {formTags.includes(tag.id) && <Check className="size-3" />}
                  {tag.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setFormTags([]); setTagsOpen(true) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Tags className="size-3" />
              Управление тегами
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={saveLink} disabled={!formTitle.trim() || !formUrl.trim()}>
            {editingLink ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ссылки</h1>
          <p className="text-sm text-muted-foreground">Управление полезными ссылками</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTagManageOpen(true)}>
            <Tags className="mr-2 size-4" />
            Теги
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Добавить ссылку
          </Button>
        </div>
      </div>

      {/* Search and Tag Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск ссылок..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Tag filter chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleFilterTag(tag.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  selectedTagIds.includes(tag.id)
                    ? `${tag.color} text-white`
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tag.name}
              </button>
            ))}
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Links Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredLinks.map((link) => (
          <Card key={link.id} className="group relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex flex-col gap-1.5 p-2.5">
              {/* Header: Title + Three-dot menu */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold truncate">{link.title}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(link)}>
                      <Pencil className="mr-2 size-4" />
                      Изменить название
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setEditingLink(link)
                      setFormTitle(link.title)
                      setFormUrl(link.url)
                      setFormTags(link.tags)
                      setFormFavicon(link.favicon || "")
                      setCreateOpen(true)
                    }}>
                      <Pencil className="mr-2 size-4" />
                      Изменить URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setEditingLink(link)
                      setFormTags(link.tags)
                      setTagsOpen(true)
                    }}>
                      <Tags className="mr-2 size-4" />
                      Изменить теги
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="mr-2 size-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Icon + domain */}
              <div className="flex items-center gap-2">
                <LinkFavicon favicon={link.favicon} />
                <span className="truncate text-xs text-muted-foreground">{getDomain(link.url)}</span>
              </div>

              {/* Open and Copy buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  asChild
                >
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    Открыть
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => handleCopy(link)}
                >
                  {copiedId === link.id ? (
                    <CopyCheck className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* Tags at the bottom */}
              {link.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {link.tags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId)
                    if (!tag) return null
                    return (
                      <span
                        key={tag.id}
                        className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white", tag.color)}
                      >
                        {tag.name}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Search className="mb-4 size-12 opacity-50" />
          <h3 className="text-lg font-medium">Ничего не найдено</h3>
          <p className="text-sm">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {/* Create/Edit link dialog */}
      <LinkFormDialog open={createOpen} onOpenChange={setCreateOpen} title={editingLink ? "Редактировать ссылку" : "Создать ссылку"} />

      {/* Edit tags dialog */}
      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Теги ссылки</DialogTitle>
            <DialogDescription>{editingLink?.title}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5 py-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleFormTag(tag.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white transition-opacity",
                  tag.color,
                  !formTags.includes(tag.id) && "opacity-40"
                )}
              >
                {formTags.includes(tag.id) && <Check className="size-3" />}
                {tag.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagsOpen(false)}>Отмена</Button>
            <Button onClick={saveTags}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag management dialog */}
      <Dialog open={tagManageOpen} onOpenChange={setTagManageOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Управление тегами</DialogTitle>
            <DialogDescription>Создавайте и удаляйте теги</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {/* Add tag */}
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Новый тег"
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button size="sm" onClick={addTag} disabled={!newTagName.trim()}>
                <Plus className="size-4" />
              </Button>
            </div>
            {/* Tags list */}
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-3 rounded-full", tag.color)} />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <button onClick={() => removeTag(tag.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground text-center">Нет тегов</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
