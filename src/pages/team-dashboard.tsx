import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Plus,
  X,
  GripVertical,
  LayoutGrid,
  ListTodo,
  Calendar,
  Link2,
  StickyNote,
  BarChart3,
  Users,
  Settings2,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { useTeams } from "@/hooks/use-teams"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type WidgetType = "tasks" | "calendar" | "links" | "notes" | "stats" | "members"

interface Widget {
  id: string
  type: WidgetType
  title: string
  w: number
  h: number
  x: number
  y: number
}

const COLS = 6
const CELL_SIZE = 180
const GAP = 16

const widgetTypes: { type: WidgetType; title: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { type: "tasks", title: "Список задач", icon: ListTodo, color: "bg-blue-500" },
  { type: "calendar", title: "Календарь", icon: Calendar, color: "bg-purple-500" },
  { type: "links", title: "Ссылки", icon: Link2, color: "bg-green-500" },
  { type: "notes", title: "Заметки", icon: StickyNote, color: "bg-yellow-500" },
  { type: "stats", title: "Статистика", icon: BarChart3, color: "bg-red-500" },
  { type: "members", title: "Участники", icon: Users, color: "bg-orange-500" },
]

function loadWidgets(): Widget[] {
  try {
    const saved = localStorage.getItem("dashboard_widgets")
    if (saved) return JSON.parse(saved)
  } catch {}
  return [
    { id: "1", type: "tasks", title: "Мои задачи", w: 2, h: 2, x: 0, y: 0 },
    { id: "2", type: "calendar", title: "Календарь", w: 1, h: 2, x: 2, y: 0 },
    { id: "3", type: "stats", title: "Статистика", w: 3, h: 1, x: 0, y: 2 },
    { id: "4", type: "links", title: "Ссылки", w: 1, h: 1, x: 3, y: 2 },
    { id: "5", type: "members", title: "Участники", w: 2, h: 1, x: 0, y: 3 },
  ]
}

function saveWidgets(widgets: Widget[]) {
  localStorage.setItem("dashboard_widgets", JSON.stringify(widgets))
}

function getWidgetColor(type: WidgetType): string {
  const wt = widgetTypes.find((w) => w.type === type)
  return wt?.color || "bg-gray-500"
}

function getWidgetIcon(type: WidgetType): React.ComponentType<{ className?: string }> {
  const wt = widgetTypes.find((w) => w.type === type)
  return wt?.icon || LayoutGrid
}

function collides(a: Widget, others: Widget[]): boolean {
  for (const b of others) {
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
      return true
    }
  }
  return false
}

function compactGrid(widgets: Widget[]): Widget[] {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x)
  const result: Widget[] = []
  for (const w of sorted) {
    let newY = w.y
    while (newY > 0 && !collides({ ...w, y: newY - 1 }, result)) {
      newY--
    }
    result.push({ ...w, y: newY })
  }
  return result
}

export function TeamDashboardPage() {
  const navigate = useNavigate()
  const { teamLogin } = useParams()
  const { isAdmin } = useTeams()
  const [widgets, setWidgets] = useState<Widget[]>(loadWidgets)
  const [editMode, setEditMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<WidgetType>("tasks")
  const [widgetTitle, setWidgetTitle] = useState("")

  const [dragging, setDragging] = useState<Widget | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = "Чисто Задачи"
  }, [])

  useEffect(() => {
    saveWidgets(widgets)
  }, [widgets])

  const handleAddWidget = () => {
    let x = 0, y = 0
    const w = 2, h = 2
    while (collides({ id: "", type: "tasks", title: "", w, h, x, y }, widgets)) {
      x++
      if (x + w > COLS) { x = 0; y++ }
    }
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: selectedType,
      title: widgetTitle || widgetTypes.find((wt) => wt.type === selectedType)?.title || "Виджет",
      w, h, x, y,
    }
    setWidgets((prev) => compactGrid([...prev, newWidget]))
    setAddOpen(false)
    setWidgetTitle("")
  }

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => compactGrid(prev.filter((w) => w.id !== id)))
  }

  const handleDragStart = useCallback((e: React.MouseEvent, widget: Widget) => {
    if (!editMode) return
    e.preventDefault()
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    setDragging({ ...widget })
    setDragOffset({
      x: e.clientX - rect.left - widget.x * (CELL_SIZE + GAP),
      y: e.clientY - rect.top - widget.y * (CELL_SIZE + GAP),
    })
    setPreviewRect({ x: widget.x, y: widget.y })
  }, [editMode])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizing && gridRef.current) {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      const newW = Math.max(1, Math.min(COLS, resizing.startW + Math.round(dx / (CELL_SIZE + GAP))))
      const newH = Math.max(1, resizing.startH + Math.round(dy / (CELL_SIZE + GAP)))
      setWidgets((prev) => prev.map((w) => w.id === resizing.id ? { ...w, w: newW, h: newH } : w))
      return
    }

    if (dragging && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect()
      const px = e.clientX - rect.left - dragOffset.x
      const py = e.clientY - rect.top - dragOffset.y
      const gx = Math.round(px / (CELL_SIZE + GAP))
      const gy = Math.round(py / (CELL_SIZE + GAP))
      const clampedX = Math.max(0, Math.min(COLS - dragging.w, gx))
      const clampedY = Math.max(0, gy)
      const tempWidget: Widget = { ...dragging, x: clampedX, y: clampedY }
      const others = widgets.filter((w) => w.id !== dragging.id)
      if (collides(tempWidget, others)) {
        setPreviewRect(null)
      } else {
        setPreviewRect({ x: clampedX, y: clampedY })
      }
    }
  }, [dragging, dragOffset, resizing, widgets])

  const handleMouseUp = useCallback(() => {
    if (resizing) {
      setResizing(null)
      return
    }
    if (dragging && previewRect) {
      const tempWidget: Widget = { ...dragging, x: previewRect.x, y: previewRect.y }
      const others = widgets.filter((w) => w.id !== dragging.id)
      if (!collides(tempWidget, others)) {
        const newWidgets = widgets.map((w) => w.id === dragging.id ? { ...w, x: previewRect.x, y: previewRect.y } : w)
        setWidgets(compactGrid(newWidgets))
      }
    }
    setDragging(null)
    setPreviewRect(null)
  }, [dragging, previewRect, resizing, widgets])

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp])

  const handleResizeStart = (e: React.MouseEvent, widget: Widget) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing({ id: widget.id, startX: e.clientX, startY: e.clientY, startW: widget.w, startH: widget.h })
  }

  const renderWidgetContent = (widget: Widget) => {
    const Icon = getWidgetIcon(widget.type)
    const color = getWidgetColor(widget.type)
    return (
      <div className="flex h-full flex-col relative">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          {editMode && (
            <div className="cursor-grab active:cursor-grabbing" onMouseDown={(e) => handleDragStart(e, widget)}>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className={cn("flex size-6 items-center justify-center rounded-md", color)}>
            <Icon className="size-3.5 text-white" />
          </div>
          <span className="flex-1 text-sm font-medium truncate">{widget.title}</span>
          {editMode && (
            <button onClick={() => handleRemoveWidget(widget.id)} className="text-muted-foreground hover:text-destructive">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon className="size-8 opacity-30" />
            <span className="text-xs">Содержимое виджета</span>
          </div>
        </div>
        {editMode && (
          <div className="absolute bottom-1 right-1 size-5 cursor-nwse-resize flex items-center justify-center text-muted-foreground hover:text-foreground rounded bg-background/80"
            onMouseDown={(e) => handleResizeStart(e, widget)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 10L10 2M6 10L10 6M2 6L10 -2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        )}
      </div>
    )
  }

  const gridHeight = useMemo(() => {
    const maxH = widgets.length > 0 ? Math.max(...widgets.map((w) => w.y + w.h)) : 1
    return Math.max(200, maxH * CELL_SIZE + (maxH - 1) * GAP)
  }, [widgets])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Чисто Задачи</h1>
          <p className="text-sm text-muted-foreground">Добро пожаловать!</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <Button variant="outline" size="sm" onClick={() => navigate(`/teams/${teamLogin}/admin`)}><Settings2 className="mr-2 size-4" />Управление командой</Button>}
          <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(!editMode)}>
            <LayoutGrid className="mr-2 size-4" />
            {editMode ? "Готово" : "Изменить виджеты"}
          </Button>
        </div>
      </div>

      {editMode && (
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="w-fit">
          <Plus className="mr-2 size-4" />
          Добавить виджет
        </Button>
      )}

      <div ref={gridRef} className="relative" style={{ width: COLS * CELL_SIZE + (COLS - 1) * GAP, minHeight: gridHeight }}>
        {widgets.map((widget) => {
          const isDragging = dragging?.id === widget.id
          return (
            <div
              key={widget.id}
              className={cn(
                "absolute overflow-hidden rounded-xl border bg-card transition-shadow",
                isDragging ? "opacity-30 z-0" : "z-10"
              )}
              style={{
                left: widget.x * (CELL_SIZE + GAP),
                top: widget.y * (CELL_SIZE + GAP),
                width: widget.w * CELL_SIZE + (widget.w - 1) * GAP,
                height: widget.h * CELL_SIZE + (widget.h - 1) * GAP,
              }}
            >
              {renderWidgetContent(widget)}
            </div>
          )
        })}

        {dragging && previewRect && (
          <div
            className="absolute rounded-xl border-2 border-dashed border-primary bg-primary/5 z-20 pointer-events-none"
            style={{
              left: previewRect.x * (CELL_SIZE + GAP),
              top: previewRect.y * (CELL_SIZE + GAP),
              width: dragging.w * CELL_SIZE + (dragging.w - 1) * GAP,
              height: dragging.h * CELL_SIZE + (dragging.h - 1) * GAP,
            }}
          />
        )}

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
            <LayoutGrid className="mb-4 size-12 opacity-30" />
            <h3 className="text-lg font-medium">Нет виджетов</h3>
            <p className="text-sm">Нажмите "Изменить виджеты" чтобы добавить первый виджет</p>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Добавить виджет</DialogTitle>
            <DialogDescription>Выберите тип виджета</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Тип</label>
              <div className="grid grid-cols-3 gap-2">
                {widgetTypes.map((wt) => (
                  <button
                    key={wt.type}
                    onClick={() => setSelectedType(wt.type)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                      selectedType === wt.type ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}
                  >
                    <wt.icon className="size-5" />
                    <span>{wt.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название</label>
              <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder="Название виджета" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={handleAddWidget}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
