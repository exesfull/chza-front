import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { EllipsisVertical, Pencil, Trash2, SquareStack, ChevronRight } from "lucide-react"
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw"
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types"
import "@excalidraw/excalidraw/index.css"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useBoards, type BoardInfo } from "@/hooks/use-boards"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function BoardPage() {
  const { teamLogin, projectId, boardId } = useParams()
  const navigate = useNavigate()
  const { getBoard, updateBoard, deleteBoard, saveScene } = useBoards(teamLogin)
  const [board, setBoard] = useState<BoardInfo | null>(null)
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null)
  const [loading, setLoading] = useState(true)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Все изменения сохраняются автоматически")
  const saveTimerRef = useRef<number | null>(null)
  const lastSceneRef = useRef<string>("")

  useEffect(() => {
    document.title = board?.name ? `${board.name} · Доски` : "Доски"
  }, [board?.name])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!boardId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const data = await getBoard(boardId)
      if (!cancelled) {
        setBoard(data?.board ?? null)
        setInitialData((data?.initialData as ExcalidrawInitialDataState | null) ?? null)
        setRenameValue(data?.board?.name ?? "")
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [boardId, getBoard])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const breadcrumbs = useMemo(() => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">Проекты</Link>
      <ChevronRight className="size-4" />
      <Link to={`/teams/${teamLogin}/projects/${projectId}`} className="hover:text-foreground">Проект</Link>
      <ChevronRight className="size-4" />
      <span className="text-foreground font-medium">{board?.name || "Доска"}</span>
    </div>
  ), [board?.name, projectId, teamLogin])

  const persistScene = async (sceneJson: string) => {
    if (!boardId || !teamLogin) return
    if (sceneJson === lastSceneRef.current) return
    lastSceneRef.current = sceneJson
    setSaving(true)
    setSaveLabel("Сохранение...")
    try {
      const ok = await saveScene(boardId, sceneJson)
      setSaveLabel(ok ? "Сохранено" : "Не удалось сохранить")
    } catch (error) {
      console.error("Failed to persist board scene:", error)
      setSaveLabel("Не удалось сохранить")
    } finally {
      setSaving(false)
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(() => setSaveLabel("Все изменения сохраняются автоматически"), 2000)
    }
  }

  const handleChange = (elements: any, appState: any, files: any) => {
    if (!boardId) return
    const sceneJson = serializeAsJSON(elements, appState, files, "database")
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = window.setTimeout(() => {
      persistScene(sceneJson)
    }, 700)
  }

  const handleRename = async () => {
    if (!boardId || !renameValue.trim()) return
    const updated = await updateBoard(boardId, { name: renameValue.trim() })
    if (updated) {
      setBoard(updated)
      setRenameOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!boardId || !projectId || !teamLogin) return
    const ok = await deleteBoard(boardId)
    if (ok) {
      navigate(`/teams/${teamLogin}/projects/${projectId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[72vh] rounded-3xl" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        {breadcrumbs}
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">Доска не найдена или была удалена</p>
          <Button className="mt-4" onClick={() => navigate(`/teams/${teamLogin}/projects/${projectId}`)}>
            Вернуться к проекту
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      {breadcrumbs}

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SquareStack className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold">{board.name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <Pencil className="mr-2 size-4" />
                    Переименовать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 size-4" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground">
              {board.description || "Описание доски не указано"} · Обновлено {formatDate(board.updated_at)}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {saving ? "Сохраняем изменения..." : saveLabel}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-background">
        {initialData ? (
          <Excalidraw
            initialData={initialData}
            onChange={handleChange}
            name={board.name}
            autoFocus
            handleKeyboardGlobally
          />
        ) : null}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать доску</DialogTitle>
            <DialogDescription>Введите новое название доски</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Название доски" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Отмена</Button>
            <Button onClick={handleRename}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы точно уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Доска будет удалена мягко и останется в базе для восстановления, но станет недоступна в проекте.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
