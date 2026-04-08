export interface TaskList {
  id: string
  name: string
  description: string
  view_type: string
  created_at: string
}

export interface TaskColumn {
  id: string
  list_id: string
  name: string
  description: string | null
  color: string
  order: number
}

export interface ApiTask {
  id: string
  task_list_id: string
  col_id: string
  parent_task_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  deadline_date: string | null
  closed_at: string | null
  priority: string
  status: string
  sort_order: number
}

export interface Task {
  id: string
  column_id: string
  title: string
  description: string | null
  deadline_date: string | null
  closed_at: string | null
  priority: "low" | "medium" | "high"
  order: number
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-blue-500",
  medium: "text-yellow-500",
  high: "text-red-500",
}

export const COLUMN_COLORS = [
  { name: "Серый", value: "#6b7280" },
  { name: "Синий", value: "#3b82f6" },
  { name: "Зелёный", value: "#22c55e" },
  { name: "Красный", value: "#ef4444" },
  { name: "Жёлтый", value: "#eab308" },
  { name: "Фиолетовый", value: "#a855f7" },
  { name: "Оранжевый", value: "#f97316" },
  { name: "Розовый", value: "#ec4899" },
  { name: "Бирюзовый", value: "#14b8a6" },
  { name: "Голубой", value: "#0ea5e9" },
  { name: "Индиго", value: "#6366f1" },
  { name: "Лайм", value: "#84cc16" },
  { name: "Коралловый", value: "#f43f5e" },
  { name: "Амбер", value: "#f59e0b" },
]
