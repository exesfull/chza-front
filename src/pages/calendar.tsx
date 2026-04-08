import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: number
  title: string
  date: string
  time: string
  color: string
}

const events: CalendarEvent[] = [
  { id: 1, title: "Созвон с командой", date: "2025-04-07", time: "10:00", color: "bg-blue-500" },
  { id: 2, title: "Дедлайн проекта", date: "2025-04-10", time: "18:00", color: "bg-red-500" },
  { id: 3, title: "Ревью кода", date: "2025-04-15", time: "14:00", color: "bg-green-500" },
  { id: 4, title: "Презентация", date: "2025-04-20", time: "11:00", color: "bg-purple-500" },
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const monthNames = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    document.title = "Календарь"
  }, [])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const getEventsForDate = (date: string) => {
    return events.filter((e) => e.date === date)
  }

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const calendarDays = []
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Календарь</h1>
          <p className="text-sm text-muted-foreground">
            Планирование событий и задач
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Добавить событие
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {/* Month Navigation */}
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

            {/* Day Headers */}
            <div className="mb-2 grid grid-cols-7 gap-px">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dayEvents = getEventsForDate(dateStr)

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-start rounded-md p-1 text-sm transition-colors hover:bg-muted",
                      isToday && "bg-muted font-bold text-primary",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <span>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn("size-1.5 rounded-full", event.color)}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Events Sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold">
                {selectedDate
                  ? `События на ${new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`
                  : "Ближайшие события"}
              </h3>
              <div className="flex flex-col gap-2">
                {(selectedDate
                  ? events.filter((e) => e.date === selectedDate)
                  : events.slice(0, 5)
                ).length > 0 ? (
                  (selectedDate
                    ? events.filter((e) => e.date === selectedDate)
                    : events.slice(0, 5)
                  ).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <div className={cn("mt-1 size-2 shrink-0 rounded-full", event.color)} />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {event.time}
                        </span>
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

          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold">Легенда</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Встречи</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <span className="text-sm">Дедлайны</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-green-500" />
                  <span className="text-sm">Ревью</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Презентации</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
