import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  description: string
  color: string
}

const colors = [
  { value: "bg-blue-500", label: "Синий" },
  { value: "bg-red-500", label: "Красный" },
  { value: "bg-green-500", label: "Зелёный" },
  { value: "bg-purple-500", label: "Фиолетовый" },
  { value: "bg-orange-500", label: "Оранжевый" },
]

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function createId() {
  return `evt_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    const aKey = `${a.date} ${a.time || "00:00"}`
    const bKey = `${b.date} ${b.time || "00:00"}`
    return aKey.localeCompare(bKey)
  })
}

export function CalendarPage() {
  const { teamLogin } = useParams()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CalendarEvent>({
    id: "",
    title: "",
    date: "",
    time: "09:00",
    description: "",
    color: "bg-blue-500",
  })

  const storageKey = useMemo(() => `chza-calendar-events:${teamLogin || "global"}`, [teamLogin])

  useEffect(() => {
    document.title = "Календарь"
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setEvents(
          parsed
            .filter((event) => event && typeof event.title === "string" && isValidDate(event.date))
            .map((event) => ({
              id: String(event.id || createId()),
              title: String(event.title || ""),
              date: String(event.date || ""),
              time: String(event.time || "09:00"),
              description: String(event.description || ""),
              color: colors.some((color) => color.value === event.color) ? String(event.color) : "bg-blue-500",
            }))
        )
      }
    } catch (error) {
      console.error("Failed to load calendar events", error)
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(events))
  }, [events, storageKey])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const calendarDays = []
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const getEventsForDate = (date: string) => sortEvents(events.filter((event) => event.date === date))

  const openCreate = (date: string) => {
    setEditingId(null)
    setForm({
      id: "",
      title: "",
      date,
      time: "09:00",
      description: "",
      color: "bg-blue-500",
    })
    setDialogOpen(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditingId(event.id)
    setForm(event)
    setDialogOpen(true)
  }

  const saveEvent = () => {
    if (!form.title.trim() || !isValidDate(form.date)) {
      return
    }

    const payload: CalendarEvent = {
      ...form,
      id: editingId || createId(),
      title: form.title.trim(),
      description: form.description.trim(),
      time: form.time || "09:00",
    }

    setEvents((prev) => {
      const withoutCurrent = prev.filter((event) => event.id !== payload.id)
      return sortEvents([...withoutCurrent, payload])
    })
    setSelectedDate(payload.date)
    setDialogOpen(false)
  }

  const deleteEvent = (eventId: string) => {
    if (!window.confirm("Удалить мероприятие?")) return
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
    if (editingId === eventId) {
      setDialogOpen(false)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((year) => year - 1)
    } else {
      setCurrentMonth((month) => month - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((year) => year + 1)
    } else {
      setCurrentMonth((month) => month + 1)
    }
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : sortEvents(events).slice(0, 8)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Календарь</h1>
          <p className="text-sm text-muted-foreground">Создавайте и редактируйте мероприятия прямо из календаря</p>
        </div>
        <Button onClick={() => openCreate(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`)}>
          <CalendarPlus className="mr-2 size-4" />
          Добавить мероприятие
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-px">
              {dayNames.map((day) => (
                <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-[1.1] rounded-md" />
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dayEvents = getEventsForDate(dateStr)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      openCreate(dateStr)
                    }}
                    className={cn(
                      "relative flex aspect-[1.1] flex-col items-center justify-start rounded-md border p-1 text-sm transition-colors hover:bg-muted",
                      isToday && "border-primary bg-muted font-bold text-primary",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <span>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className={cn("size-1.5 rounded-full", event.color)} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">
                  {selectedDate
                    ? `События на ${new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`
                    : "Ближайшие события"}
                </h3>
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    Сбросить
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {selectedEvents.length > 0 ? (
                  selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="group flex items-start gap-3 rounded-md border p-3"
                      onContextMenu={(e) => {
                        e.preventDefault()
                        openEdit(event)
                      }}
                    >
                      <div className={cn("mt-1 size-2 shrink-0 rounded-full", event.color)} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-medium">{event.title}</span>
                          <div className="flex gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                            <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => openEdit(event)}>
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => deleteEvent(event.id)}>
                              <Trash2 className="size-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {event.date} {event.time}
                        </span>
                        {event.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <CalendarIcon className="mx-auto mb-2 size-8 opacity-50" />
                    Нет событий
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать мероприятие" : "Новое мероприятие"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Название события" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Дата *</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Время</label>
                <Input type="time" value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Необязательно" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Цвет</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color: color.value }))}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                      form.color === color.value && "border-primary"
                    )}
                  >
                    <span className={cn("size-3 rounded-full", color.value)} />
                    {color.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {editingId && (
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteEvent(editingId)}>
                  Удалить
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={saveEvent}>{editingId ? "Сохранить" : "Создать"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
