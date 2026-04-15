import { useState, useEffect, useRef } from "react"
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
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type WidgetType = "tasks" | "calendar" | "links" | "notes" | "stats" | "members"
type WidgetSize = "1x1" | "1x2" | "2x1" | "2x2" | "1x3" | "3x1" | "2x3" | "3x2"

interface Widget {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  col: number
  row: number
}

const widgetTypes: { type: WidgetType; title: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { type: "tasks", title: "Список задач", icon: ListTodo, color: "bg-blue-500" },
  { type: "calendar", title: "Календарь", icon: Calendar, color: "bg-purple-500" },
  { type: "links", title: "Ссылки", icon: Link2, color: "bg-green-500" },
  { type: "notes", title: "Заметки", icon: StickyNote, color: "bg-yellow-500" },
  { type: "stats", title: "Статистика", icon: BarChart3, color: "bg-red-500" },
  { type: "members", title: "Участники", icon: Users, color: "bg-orange-500" },
]

const sizeOptions: { value: WidgetSize; label: string }[] = [
  { value: "1x1", label: "1 × 1" },
  { value: "2x1", label: "2 × 1" },
  { value: "1x2", label: "1 × 2" },
  { value: "2x2", label: "2 × 2" },
  { value: "3x1", label: "3 × 1" },
  { value: "1x3", label: "1 × 3" },
  { value: "3x2", label: "3 × 2" },
  { value: "2x3", label: "2 × 3" },
]

const initialWidgets: Widget[] = [
  { id: "1", type: "tasks", title: "Мои задачи", size: "2x2", col: 0, row: 0 },
  { id: "2", type: "calendar", title: "Календарь", size: "1x2", col: 2, row: 0 },
  { id: "3", type: "stats", title: "Статистика", size: "3x1", col: 0, row: 2 },
  { id: "4", type: "links", title: "Ссылки", size: "1x1", col: 3, row: 2 },
  { id: "5", type: "members", title: "Участники", size: "2x1", col: 0, row: 3 },
]

function getGridStyle(size: WidgetSize): React.CSSProperties {
  const [w, h] = size.split("x").map(Number)
  return {
    gridColumn: `span ${w}`,
    gridRow: `span ${h}`,
  }
}

function getWidgetColor(type: WidgetType): string {
  const wt = widgetTypes.find((w) => w.type === type)
  return wt?.color || "bg-gray-500"
}

function getWidgetIcon(type: WidgetType): React.ComponentType<{ className?: string }> {
  const wt = widgetTypes.find((w) => w.type === type)
  return wt?.icon || LayoutGrid
}

export function TeamDashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
  const [editMode, setEditMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<WidgetType>("tasks")
  const [selectedSize, setSelectedSize] = useState<WidgetSize>("2x1")
  const [widgetTitle, setWidgetTitle] = useState("")

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    document.title = "Чисто Задачи"
  }, [])

  const handleAddWidget = () => {
    const maxRow = widgets.length > 0 ? Math.max(...widgets.map((w) => w.row + parseInt(w.size.split("x")[1]))) : 0
    const maxCol = widgets.length > 0 ? Math.max(...widgets.map((w) => w.col + parseInt(w.size.split("x")[0]))) : 0
    const [w] = selectedSize.split("x").map(Number)
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: selectedType,
      title: widgetTitle || widgetTypes.find((wt) => wt.type === selectedType)?.title || "Виджет",
      size: selectedSize,
      col: maxCol + w > 6 ? 0 : maxCol,
      row: maxCol + w > 6 ? maxRow : 0,
    }
    setWidgets((prev) => [...prev, newWidget])
    setAddOpen(false)
    setWidgetTitle("")
  }

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!editMode) return
    setDraggedId(id)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (editMode && draggedId && draggedId !== id) {
      setDragOverId(id)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!editMode || !draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    setWidgets((prev) => {
      const newWidgets = [...prev]
      const draggedIdx = newWidgets.findIndex((w) => w.id === draggedId)
      const targetIdx = newWidgets.findIndex((w) => w.id === targetId)
      if (draggedIdx === -1 || targetIdx === -1) return prev

      // Swap positions
      const dragged = { ...newWidgets[draggedIdx] }
      const target = { ...newWidgets[targetIdx] }
      newWidgets[draggedIdx] = { ...dragged, col: target.col, row: target.row }
      newWidgets[targetIdx] = { ...target, col: dragged.col, row: dragged.row }
      return newWidgets
    })
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const renderWidgetContent = (widget: Widget) => {
    const Icon = getWidgetIcon(widget.type)
    const color = getWidgetColor(widget.type)

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          {editMode && (
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
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
        {/* Content */}
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon className="size-8 opacity-30" />
            <span className="text-xs">Содержимое виджета</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Чисто Задачи</h1>
          <p className="text-sm text-muted-foreground">Добро пожаловать!</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            <LayoutGrid className="mr-2 size-4" />
            {editMode ? "Готово" : "Изменить виджеты"}
          </Button>
        </div>
      </div>

      {/* Add widget button */}
      {editMode && (
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="w-fit">
          <Plus className="mr-2 size-4" />
          Добавить виджет
        </Button>
      )}

      {/* Widgets grid - 6 columns */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gridAutoRows: "minmax(180px, auto)" }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border bg-card transition-all",
              dragOverId === widget.id && "ring-2 ring-primary ring-offset-2",
              draggedId === widget.id && "opacity-40"
            )}
            style={getGridStyle(widget.size)}
            draggable={editMode}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDrop={(e) => handleDrop(e, widget.id)}
          >
            {renderWidgetContent(widget)}
          </div>
        ))}

        {/* Empty state */}
        {widgets.length === 0 && (
          <div
            className="col-span-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground"
          >
            <LayoutGrid className="mb-4 size-12 opacity-30" />
            <h3 className="text-lg font-medium">Нет виджетов</h3>
            <p className="text-sm">Нажмите "Изменить виджеты" чтобы добавить первый виджет</p>
          </div>
        )}
      </div>

      {/* Add widget dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Добавить виджет</DialogTitle>
            <DialogDescription>Выберите тип и размер виджета</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {/* Widget type */}
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
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название</label>
              <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder="Название виджета" />
            </div>
            {/* Size */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Размер</label>
              <Select value={selectedSize} onValueChange={(v) => setSelectedSize(v as WidgetSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
