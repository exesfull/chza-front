import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { TaskList, TaskColumn, Task, ApiTask, TaskWidget } from "@/types/task"
import { COLUMN_COLORS } from "@/types/task"

export type TaskListSort = "name_asc" | "name_desc" | "date_created_asc" | "date_created_desc"

interface ApiTaskList {
  id: number
  name: string
  description: string | null
  view_type: string
}

interface ApiColumn {
  id: string
  task_list_id: string
  name: string
  description: string | null
  color_hex: string
  sort_order: number
}

export interface ListInfo {
  list: {
    id: string
    name: string
    description: string
    view_type: string
    created_at: string
    updated_at: string
  }
  cols: TaskColumn[]
}

export interface TaskChatMessage {
  id: string
  chat_id: string
  user_id: string | null
  role: string
  content: string
  meta: Record<string, unknown> | null
  attachments?: Array<{
    id: string
    message_id: string
    task_id: string
    storage_file_id: string
    file_name: string
    mime_type: string | null
    file_kind: string | null
    size_bytes: number
    download_url?: string | null
    preview_url?: string | null
  }>
  is_deleted?: boolean
  edited_at?: string | null
  edited_by?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TaskActivityLog {
  id: string
  action: string
  message: string
  meta: Record<string, unknown> | null
  created_at: string | null
}

export interface TaskCardData {
  task: Task
  chat: {
    id: string
    task_id: string
    list_id: string
    team_id: string
    created_by: string | null
    created_at: string | null
    updated_at: string | null
  } | null
  messages: TaskChatMessage[]
  history: TaskActivityLog[]
  widgets: TaskWidget[]
}

function buildProjectQuery(projectId?: string | null): string {
  return projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
}

export function useTaskLists(teamLogin: string | undefined, projectId?: string | null) {
  const [lists, setLists] = useState<TaskList[]>([])
  const [columns, setColumns] = useState<TaskColumn[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch lists from API
  const fetchLists = useCallback(async () => {
    if (!teamLogin) return
    setLoading(true)
    try {
      const { data } = await api.get(`/main/task/getLists/?team_login=${teamLogin}${buildProjectQuery(projectId)}`)
      if (data.status && Array.isArray(data.data)) {
        const mapped: TaskList[] = data.data.map((item: ApiTaskList) => ({
          id: String(item.id),
          name: item.name,
          description: item.description || "",
          view_type: item.view_type,
          created_at: new Date().toISOString(),
        }))
        setLists(mapped)
      }
    } catch (error) {
      console.error("Failed to fetch task lists:", error)
    } finally {
      setLoading(false)
    }
  }, [teamLogin, projectId])

  useEffect(() => { fetchLists() }, [fetchLists])

  // Create list via API (FormData)
  const createList = useCallback(async (name: string, description?: string) => {
    if (!teamLogin) return null
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("name", name)
      formData.append("description", description || "")
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/createList/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        const newItem: TaskList = {
          id: String(data.data.id),
          name: data.data.name,
          description: data.data.description || "",
          view_type: data.data.view_type || "kanban",
          created_at: new Date().toISOString(),
        }
        setLists((prev) => [...prev, newItem])
        return newItem
      }
    } catch (error) {
      console.error("Failed to create task list:", error)
    }
    return null
  }, [teamLogin, projectId])

  // Edit list via API (FormData)
  const editList = useCallback(async (listId: string, updates: { name?: string; description?: string; view_type?: "kanban" | "table"; is_deleted?: boolean; is_archived?: boolean }) => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      if (updates.name !== undefined) formData.append("name", updates.name)
      if (updates.description !== undefined) formData.append("description", updates.description)
      if (updates.view_type !== undefined) formData.append("view_type", updates.view_type)
      if (updates.is_deleted !== undefined) formData.append("is_deleted", updates.is_deleted ? "true" : "false")
      if (updates.is_archived !== undefined) formData.append("is_archived", String(updates.is_archived))
      const { data } = await api.post("/main/task/editList/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        setLists((prev) => prev.map((l) => l.id === listId ? {
          ...l,
          name: data.data.name ?? l.name,
          description: data.data.description ?? l.description,
          view_type: data.data.view_type ?? l.view_type,
        } : l))
        return true
      }
    } catch (error) {
      console.error("Failed to edit task list:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Delete list via API (soft delete)
  const deleteList = useCallback(async (id: string) => {
    await editList(id, { is_deleted: true })
    setLists((prev) => prev.filter((l) => l.id !== id))
    setColumns((prev) => prev.filter((c) => c.list_id !== id))
    setTasks((prev) => prev.filter((t) => t.column_id !== id))
  }, [editList])

  // Archive list via API
  const archiveList = useCallback(async (id: string) => {
    await editList(id, { is_archived: true })
    setLists((prev) => prev.filter((l) => l.id !== id))
  }, [editList])

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, name } : l))
  }, [])

  // Get list info (list + columns) from API
  const getListInfo = useCallback(async (listId: string): Promise<ListInfo | null> => {
    if (!teamLogin) return null
    try {
      const { data } = await api.get(`/main/task/getListInfo/?team_login=${teamLogin}&list_id=${listId}${buildProjectQuery(projectId)}`)
      if (data.status && data.data) {
        const listData = data.data.list
        const colsData: ApiColumn[] = data.data.cols || []
        const mappedCols: TaskColumn[] = colsData.map((c: ApiColumn) => ({
          id: c.id,
          list_id: c.task_list_id,
          name: c.name,
          description: c.description,
          color: c.color_hex,
          order: c.sort_order,
        }))
        return {
          list: {
            id: listData.id,
            name: listData.name,
            description: listData.description || "",
            view_type: listData.view_type,
            created_at: listData.created_at,
            updated_at: listData.updated_at,
          },
          cols: mappedCols.sort((a, b) => a.order - b.order),
        }
      }
    } catch (error) {
      console.error("Failed to fetch list info:", error)
    }
    return null
  }, [teamLogin, projectId])

  // Update column sort order after drag-and-drop
  const updateListColsSort = useCallback(async (listId: string, columnIds: string[]): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("column_ids", JSON.stringify(columnIds))
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/updateListColsSort/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        return true
      } else {
        window.alert("Ошибка при сохранении порядка колонок")
        return false
      }
    } catch (error) {
      console.error("Failed to update column sort order:", error)
      window.alert("Ошибка при сохранении порядка колонок")
      return false
    }
  }, [teamLogin, projectId])

  // Edit column via API
  const editListCol = useCallback(async (listId: string, colId: string, updates: { name?: string; description?: string; color_hex?: string; is_deleted?: boolean }): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("col_id", colId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      if (updates.name !== undefined) formData.append("name", updates.name)
      if (updates.description !== undefined) formData.append("description", updates.description)
      if (updates.color_hex !== undefined) formData.append("color_hex", updates.color_hex)
      if (updates.is_deleted !== undefined) formData.append("is_deleted", String(updates.is_deleted))
      const { data } = await api.post("/main/task/editListCol/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to edit column:", error)
      return false
    }
  }, [teamLogin, projectId])

  // Create column via API
  const createListCol = useCallback(async (listId: string, name: string, color_hex?: string) => {
    if (!teamLogin) return null
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("name", name)
      if (color_hex) formData.append("color_hex", color_hex)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/createListCol/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        const newCol: TaskColumn = {
          id: data.data.id,
          list_id: data.data.task_list_id,
          name: data.data.name,
          description: data.data.description || null,
          color: data.data.color_hex || COLUMN_COLORS[0].value,
          order: data.data.sort_order,
        }
        setColumns((prev) => [...prev, newCol])
        return newCol
      }
    } catch (error) {
      console.error("Failed to create column:", error)
    }
    return null
  }, [teamLogin, projectId])

  // Columns
  const addColumn = useCallback((listId: string, name: string) => {
    const maxOrder = Math.max(0, ...columns.filter((c) => c.list_id === listId).map((c) => c.order))
    const newCol: TaskColumn = {
      id: crypto.randomUUID(),
      list_id: listId,
      name,
      description: null,
      color: COLUMN_COLORS[0].value,
      order: maxOrder + 1,
    }
    setColumns((prev) => [...prev, newCol])
    return newCol
  }, [columns])

  const deleteColumn = useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId))
    setTasks((prev) => prev.filter((t) => t.column_id !== columnId))
  }, [])

  const renameColumn = useCallback((columnId: string, name: string) => {
    setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, name } : c))
  }, [])

  const setColumnColor = useCallback((columnId: string, color: string) => {
    setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, color } : c))
  }, [])

  const reorderColumns = useCallback((columnIds: string[]) => {
    setColumns((prev) => {
      const newCols = [...prev]
      columnIds.forEach((id, index) => {
        const col = newCols.find((c) => c.id === id)
        if (col) col.order = index
      })
      return newCols
    })
  }, [])

  const archiveAllInColumn = useCallback(async (columnId: string) => {
    const now = new Date()
    const localDateTime = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0')
    setTasks((prev) => prev.map((t) => t.column_id === columnId ? { ...t, closed_at: localDateTime } : t))
  }, [])

  // Fetch tasks for a list from API
  const fetchTasks = useCallback(async (listId: string): Promise<Task[]> => {
    try {
      const { data } = await api.get(`/main/task/getTasksOnList/?team_login=${teamLogin}&list_id=${listId}${buildProjectQuery(projectId)}`)
      if (data.status && Array.isArray(data.data)) {
        const mapped: Task[] = data.data.map((apiTask: ApiTask) => ({
          id: apiTask.id,
          column_id: apiTask.col_id,
          title: apiTask.title,
          description: apiTask.description,
          deadline_date: apiTask.deadline_date,
          closed_at: apiTask.closed_at,
          priority: apiTask.priority as "low" | "medium" | "high",
          order: apiTask.sort_order,
          created_by: apiTask.created_by,
          created_at: apiTask.created_at,
          updated_at: apiTask.updated_at,
          widgets: Array.isArray((apiTask as unknown as { widgets?: TaskWidget[] }).widgets) ? (apiTask as unknown as { widgets?: TaskWidget[] }).widgets : [],
        }))
        setTasks(mapped)
        return mapped
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    }
    return []
  }, [teamLogin, projectId])

  // Create task via API
  const createTask = useCallback(async (listId: string, columnId: string, title: string): Promise<Task | null> => {
    if (!teamLogin) return null
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("title", title)
      formData.append("col_id", columnId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/createTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        const newTask: Task = {
          id: data.data.id,
          column_id: data.data.col_id,
          title: data.data.title,
          description: data.data.description || null,
          deadline_date: data.data.deadline_date || null,
          closed_at: data.data.closed_at || null,
          priority: data.data.priority || null,
          order: data.data.sort_order,
          created_by: data.data.created_by || "",
          created_at: data.data.created_at || new Date().toISOString(),
          updated_at: data.data.updated_at || new Date().toISOString(),
        }
        setTasks((prev) => [...prev, newTask])
        return newTask
      }
    } catch (error) {
      console.error("Failed to create task:", error)
    }
    return null
  }, [teamLogin, projectId])

  const getTaskCard = useCallback(async (listId: string, taskId: string): Promise<TaskCardData | null> => {
    if (!teamLogin) return null
    try {
      const { data } = await api.get(`/main/task/getTaskCard/?team_login=${teamLogin}&list_id=${listId}&task_id=${taskId}${buildProjectQuery(projectId)}`)
      if (data.status && data.data) {
        return {
          task: data.data.task as Task,
          chat: data.data.chat || null,
          messages: Array.isArray(data.data.messages) ? (data.data.messages as TaskChatMessage[]) : [],
          history: Array.isArray(data.data.history) ? (data.data.history as TaskActivityLog[]) : [],
          widgets: Array.isArray(data.data.widgets) ? (data.data.widgets as TaskWidget[]) : [],
        }
      }
    } catch (error) {
      console.error("Failed to fetch task card:", error)
    }
    return null
  }, [teamLogin, projectId])

  const sendTaskMessage = useCallback(async (listId: string, taskId: string, content: string, files?: File[]): Promise<TaskChatMessage | null> => {
    if (!teamLogin) return null
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("content", content)
      files?.forEach((file) => {
        formData.append("files[]", file)
      })
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/sendTaskMessage/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        return data.data as TaskChatMessage
      }
    } catch (error) {
      console.error("Failed to send task message:", error)
    }
    return null
  }, [teamLogin, projectId])

  // Toggle task completion (set closed_at or null)
  const toggleTask = useCallback(async (listId: string, taskId: string, currentlyCompleted: boolean): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      // Send empty string to uncomplete, or local datetime to complete (without timezone 'Z')
      if (currentlyCompleted) {
        formData.append("closed_at", "")
      } else {
        const now = new Date()
        const localDateTime = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + 'T' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0')
        formData.append("closed_at", localDateTime)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        // API returns the updated task
        const newClosedAt = data.data.closed_at || null
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, closed_at: newClosedAt } : t))
        return true
      }
    } catch (error) {
      console.error("Failed to toggle task:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Update task title
  const updateTaskText = useCallback(async (listId: string, taskId: string, title: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("title", title)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, title } : t))
        return true
      }
    } catch (error) {
      console.error("Failed to update task:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Move task to another column
  const moveTask = useCallback(async (listId: string, taskId: string, targetColumnId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("col_id", targetColumnId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => {
          const tasksInTarget = prev.filter((t) => t.column_id === targetColumnId && t.id !== taskId)
          const maxOrder = tasksInTarget.length > 0 ? Math.max(...tasksInTarget.map((t) => t.order)) : -1
          return prev.map((t) =>
            t.id === taskId
              ? { ...t, column_id: targetColumnId, order: maxOrder + 1 }
              : t
          )
        })
        return true
      }
    } catch (error) {
      console.error("Failed to move task:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Update task sort order within a column
  const updateColTasksSort = useCallback(async (columnId: string, taskIds: string[]): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("col_id", columnId)
      formData.append("data", JSON.stringify(taskIds))
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/updateColTaskssSort/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to update task sort:", error)
      return false
    }
  }, [teamLogin, projectId])

  // Update task description
  const updateTaskDescription = useCallback(async (listId: string, taskId: string, description: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("description", description)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, description: data.data.description || null } : t))
        return true
      }
    } catch (error) {
      console.error("Failed to update task description:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Update task deadline
  const updateTaskDeadline = useCallback(async (listId: string, taskId: string, deadline: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("deadline_date", deadline || "")
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        const newDeadline = data.data.deadline_date || null
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, deadline_date: newDeadline } : t))
        return true
      }
    } catch (error) {
      console.error("Failed to update task deadline:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Update task priority
  const updateTaskPriority = useCallback(async (listId: string, taskId: string, priority: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("priority", priority)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, priority: data.data.priority || null } : t))
        return true
      }
    } catch (error) {
      console.error("Failed to update task priority:", error)
    }
    return false
  }, [teamLogin, projectId])

  const editTaskMessage = useCallback(async (listId: string, payload: { message_id: string; content?: string; attachment_id?: string; file_name?: string }): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value))
        }
      })
      const { data } = await api.post("/main/task/editTaskMessage/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to edit task message:", error)
      return false
    }
  }, [teamLogin, projectId])

  const editTaskAttachment = useCallback(async (listId: string, attachmentId: string, fileName: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("attachment_id", attachmentId)
      formData.append("file_name", fileName)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTaskMessage/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to rename task attachment:", error)
      return false
    }
  }, [teamLogin, projectId])

  const deleteTaskMessage = useCallback(async (listId: string, messageId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("message_id", messageId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/deleteTaskMessage/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to delete task message:", error)
      return false
    }
  }, [teamLogin, projectId])

  const deleteTaskAttachment = useCallback(async (listId: string, attachmentId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("attachment_id", attachmentId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/deleteTaskAttachment/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to delete task attachment:", error)
      return false
    }
  }, [teamLogin, projectId])

  const upsertTaskWidget = useCallback(async (listId: string, payload: { task_id: string; widget_id?: string; type: string; title: string; value?: string; data?: Record<string, unknown> | null }): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value))
        }
      })
      const { data } = await api.post("/main/task/upsertTaskWidget/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to save task widget:", error)
      return false
    }
  }, [teamLogin, projectId])

  const deleteTaskWidget = useCallback(async (listId: string, widgetId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("widget_id", widgetId)
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/deleteTaskWidget/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data.status === true
    } catch (error) {
      console.error("Failed to delete task widget:", error)
      return false
    }
  }, [teamLogin, projectId])

  // Archive task
  const archiveTask = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("status", "archived")
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        return true
      }
    } catch (error) {
      console.error("Failed to archive task:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Delete task (status = "deleted")
  const deleteTask = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!teamLogin) return false
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("list_id", listId)
      formData.append("task_id", taskId)
      formData.append("status", "deleted")
      if (projectId) {
        formData.append("project_id", projectId)
      }
      const { data } = await api.post("/main/task/editTask/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        return true
      }
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
    return false
  }, [teamLogin, projectId])

  // Delete all tasks in a column
  const deleteAllTasksInColumn = useCallback(async (listId: string, columnId: string, onProgress?: (done: number, total: number) => void): Promise<boolean> => {
    if (!teamLogin) return false
    const tasksInCol = tasks.filter((t) => t.column_id === columnId)
    if (tasksInCol.length === 0) return true

    for (let i = 0; i < tasksInCol.length; i++) {
      try {
        const formData = new FormData()
        formData.append("team_login", teamLogin)
        formData.append("list_id", listId)
        formData.append("task_id", tasksInCol[i].id)
        formData.append("status", "deleted")
        if (projectId) {
          formData.append("project_id", projectId)
        }
        await api.post("/main/task/editTask/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        onProgress?.(i + 1, tasksInCol.length)
      } catch (error) {
        console.error("Failed to delete task:", tasksInCol[i].id, error)
      }
    }
    // Refresh tasks
    setTasks((prev) => prev.filter((t) => t.column_id !== columnId))
    return true
  }, [teamLogin, projectId, tasks])

  // Archive all tasks in a column
  const archiveAllTasksInColumn = useCallback(async (listId: string, columnId: string, onlyCompleted: boolean = false, onProgress?: (done: number, total: number) => void): Promise<boolean> => {
    if (!teamLogin) return false
    let tasksInCol = tasks.filter((t) => t.column_id === columnId)
    if (onlyCompleted) {
      tasksInCol = tasksInCol.filter((t) => t.closed_at)
    }
    if (tasksInCol.length === 0) return true

    for (let i = 0; i < tasksInCol.length; i++) {
      try {
        const formData = new FormData()
        formData.append("team_login", teamLogin)
        formData.append("list_id", listId)
        formData.append("task_id", tasksInCol[i].id)
        formData.append("status", "archived")
        if (projectId) {
          formData.append("project_id", projectId)
        }
        await api.post("/main/task/editTask/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        onProgress?.(i + 1, tasksInCol.length)
      } catch (error) {
        console.error("Failed to archive task:", tasksInCol[i].id, error)
      }
    }
    // Refresh tasks - remove archived ones
    setTasks((prev) => prev.filter((t) => t.column_id !== columnId || (onlyCompleted && !tasksInCol.find((at) => at.id === t.id))))
    return true
  }, [teamLogin, projectId, tasks])

  const getColumnsForList = useCallback((listId: string) => {
    return columns.filter((c) => c.list_id === listId).sort((a, b) => a.order - b.order)
  }, [columns])

  const getTasksForColumn = useCallback((columnId: string) => {
    return tasks.filter((t) => t.column_id === columnId).sort((a, b) => a.order - b.order)
  }, [tasks])

  return {
    lists,
    loading,
    columns,
    tasks,
    createList,
    editList,
    deleteList,
    archiveList,
    renameList,
    getListInfo,
    updateListColsSort,
    editListCol,
    createListCol,
    refreshLists: fetchLists,
    addColumn,
    deleteColumn,
    renameColumn,
    setColumnColor,
    reorderColumns,
    archiveAllInColumn,
    fetchTasks,
    createTask,
    toggleTask,
    updateTaskText,
    updateTaskDescription,
    updateTaskDeadline,
    updateTaskPriority,
    editTaskMessage,
    editTaskAttachment,
    deleteTaskMessage,
    deleteTaskAttachment,
    upsertTaskWidget,
    deleteTaskWidget,
    archiveTask,
    deleteTask,
    moveTask,
    updateColTasksSort,
    deleteAllTasksInColumn,
    archiveAllTasksInColumn,
    getTaskCard,
    sendTaskMessage,
    getColumnsForList,
    getTasksForColumn,
  }
}
