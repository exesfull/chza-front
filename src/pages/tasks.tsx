import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Plus, Search, FolderOpen, MoreHorizontal, ArrowUpDown, ArrowUpAZ, ArrowUpZA, CalendarArrowDown, CalendarArrowUp, LayoutGrid, Table, Pencil, Trash2, Archive } from "lucide-react"
import { useTaskLists, type TaskListSort } from "@/hooks/use-task-lists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MAX_NAME = 200
const MAX_DESC = 1000

export function TasksPage() {
  const { teamLogin } = useParams()
  const { lists, loading, createList, editList, deleteList, archiveList, refreshLists } = useTaskLists(teamLogin)
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<TaskListSort>("name_asc")
  const [sortOpen, setSortOpen] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createSubmitting, setCreateSubmitting] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editView, setEditView] = useState<"kanban" | "table">("kanban")
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Confirm dialog (archive/delete)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = "Задачи"
  }, [])

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  const sortedLists = (() => {
    const sorted = [...filteredLists]
    switch (sortBy) {
      case "name_asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"))
      case "name_desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name, "ru"))
      case "date_created_asc":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case "date_created_desc":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      default:
        return sorted
    }
  })()

  // Reset form on dialog open
  useEffect(() => {
    if (createOpen) {
      setCreateName("")
      setCreateDesc("")
      setCreateSubmitting(false)
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [createOpen])

  useEffect(() => {
    if (editOpen && editId) {
      const list = lists.find((l) => l.id === editId)
      if (list) {
        setEditName(list.name)
        setEditDesc(list.description || "")
        setEditView(list.view_type === "table" ? "table" : "kanban")
      }
      setEditSubmitting(false)
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [editOpen, editId, lists])

  const handleCreate = async () => {
    if (!createName.trim() || createSubmitting) return
    setCreateSubmitting(true)
    const list = await createList(createName.trim(), createDesc.trim())
    if (list) {
      setCreateOpen(false)
      navigate(`/teams/${teamLogin}/tasks/${list.id}`)
    } else {
      setCreateSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editName.trim() || !editId || editSubmitting) return
    setEditSubmitting(true)
    const ok = await editList(editId, {
      name: editName.trim(),
      description: editDesc.trim(),
      view_type: editView,
    })
    if (ok) {
      refreshLists()
      setEditOpen(false)
    } else {
      setEditSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirmId || !confirmAction) return
    if (confirmAction === "delete") {
      await deleteList(confirmId)
    } else {
      await archiveList(confirmId)
    }
    setConfirmOpen(false)
    setConfirmAction(null)
    setConfirmId(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Списки задач</h1>
          <p className="text-sm text-muted-foreground">
            {lists.length} {lists.length === 1 ? "лист" : lists.length < 5 ? "листа" : "листов"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Создать лист
        </Button>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск листов..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1.5 size-3.5" />
              Сортировка
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as TaskListSort)}>
              <DropdownMenuRadioItem value="name_asc">
                <ArrowUpAZ className="mr-2 size-3.5" />
                Название (А-Я)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_desc">
                <ArrowUpZA className="mr-2 size-3.5" />
                Название (Я-А)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date_created_desc">
                <CalendarArrowDown className="mr-2 size-3.5" />
                Дата создания (новые)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date_created_asc">
                <CalendarArrowUp className="mr-2 size-3.5" />
                Дата создания (старые)
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lists grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedLists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedLists.map((list) => (
            <Card
              key={list.id}
              className="group cursor-pointer transition-colors hover:bg-muted"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  onClick={() => navigate(`/teams/${teamLogin}/tasks/${list.id}`)}
                >
                  {list.view_type === "kanban" ? (
                    <LayoutGrid className="size-5" />
                  ) : (
                    <Table className="size-5" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span
                    className="font-medium hover:underline truncate"
                    onClick={() => navigate(`/teams/${teamLogin}/tasks/${list.id}`)}
                  >
                    {list.name}
                  </span>
                  {list.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {list.description}
                    </span>
                  )}
                </div>
                {/* Always visible 3-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditId(list.id); setEditOpen(true) }}>
                      <Pencil className="mr-2 size-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setConfirmId(list.id); setConfirmAction("archive"); setConfirmOpen(true) }}>
                      <Archive className="mr-2 size-4" />
                      Архивировать
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => { setConfirmId(list.id); setConfirmAction("delete"); setConfirmOpen(true) }}>
                      <Trash2 className="mr-2 size-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : search ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Search className="mb-2 size-8 opacity-50" />
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <FolderOpen className="mb-2 size-8 opacity-50" />
          <p>Нет листов задач. Создайте первый!</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать лист задач</DialogTitle>
            <DialogDescription>Заполните информацию о новом листе задач</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input
                ref={nameInputRef}
                placeholder="Название листа"
                value={createName}
                maxLength={MAX_NAME}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <span className="text-xs text-muted-foreground text-right">{createName.length}/{MAX_NAME}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                placeholder="Описание листа"
                value={createDesc}
                maxLength={MAX_DESC}
                onChange={(e) => setCreateDesc(e.target.value)}
                rows={3}
              />
              <span className="text-xs text-muted-foreground text-right">{createDesc.length}/{MAX_DESC}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || createSubmitting}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать лист</DialogTitle>
            <DialogDescription>Измените информацию о листе задач</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input
                ref={nameInputRef}
                placeholder="Название листа"
                value={editName}
                maxLength={MAX_NAME}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
              <span className="text-xs text-muted-foreground text-right">{editName.length}/{MAX_NAME}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                placeholder="Описание листа"
                value={editDesc}
                maxLength={MAX_DESC}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
              <span className="text-xs text-muted-foreground text-right">{editDesc.length}/{MAX_DESC}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Тип</label>
              <Select value={editView} onValueChange={(v) => setEditView(v as "kanban" | "table")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kanban">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="size-4" />
                      Канбан
                    </div>
                  </SelectItem>
                  <SelectItem value="table">
                    <div className="flex items-center gap-2">
                      <Table className="size-4" />
                      Таблица
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || editSubmitting}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog (Archive/Delete) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "delete" ? "Удалить лист?" : "Архивировать лист?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? "Лист будет удалён безвозвратно. Это действие нельзя отменить."
                : "Лист будет перемещён в архив."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Отмена</Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {confirmAction === "delete" ? "Удалить" : "Архивировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
