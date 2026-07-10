import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"

export interface ProjectInfo {
  id: string
  name: string
  description: string | null
  img_url: string | null
  is_archived: boolean
  is_deleted: boolean
  task_lists_count: number
  links_count: number
  boards_count: number
  created_at: string | null
  updated_at: string | null
}

export interface ProjectTaskList {
  id: string
  name: string
  description: string | null
  view_type: string | null
  updated_at: string | null
}

export interface ProjectLink {
  id: string
  title: string
  url: string
  comment: string | null
  color_hex: string | null
  favicon_url: string | null
  updated_at: string | null
}

export interface ProjectBoard {
  id: string
  name: string
  description: string | null
  img_url: string | null
  objects_count: number
  updated_at: string | null
}

export interface ProjectDetail extends ProjectInfo {
  items?: ProjectItem[]
  task_lists: ProjectTaskList[]
  links: ProjectLink[]
  boards: ProjectBoard[]
}

export interface ProjectItem {
  id: string
  project_id: string
  parent_id: string | null
  object_type: "folder" | "task_list" | "link" | "board" | "file"
  object_id: string | null
  name: string
  description: string | null
  sort_order: number
  created_at: string | null
  updated_at: string | null
  children?: ProjectItem[]
  size_bytes?: number
  mime_type?: string | null
  file_kind?: string | null
  download_url?: string | null
  preview_url?: string | null
  public_url?: string | null
  original_name?: string | null
  file_name?: string | null
}

function toFormBody(payload: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const form = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

function normalizeProject(project: ProjectInfo): ProjectInfo {
  return {
    ...project,
    task_lists_count: Number(project.task_lists_count ?? 0),
    links_count: Number(project.links_count ?? 0),
    boards_count: Number(project.boards_count ?? 0),
  }
}

export function useProjects(teamLogin?: string, options?: { autoLoad?: boolean }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const autoLoad = options?.autoLoad ?? true

  const refreshProjects = useCallback(async () => {
    if (!teamLogin) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get(`/main/project/list/?team_login=${teamLogin}`)
      if (data.status && Array.isArray(data.data)) {
        setProjects(data.data.map(normalizeProject))
      } else {
        setProjects([])
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error("Failed to fetch projects:", error)
      }
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [teamLogin])

  const getProject = useCallback(async (projectId: string) => {
    if (!teamLogin) {
      return null
    }

    try {
      const { data } = await api.get(`/main/project/get/?team_login=${teamLogin}&project_id=${projectId}`)
      if (data.status && data.data) {
        return data.data as ProjectDetail
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error("Failed to fetch project:", error)
      }
    }

    return null
  }, [teamLogin])

  const createProject = useCallback(async (payload: { name: string; description?: string; member_ids?: string }) => {
    if (!teamLogin) {
      return null
    }

    const { data } = await api.post(
      `/main/project/create/?team_login=${teamLogin}`,
      toFormBody(payload),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      const project = normalizeProject(data.data as ProjectInfo)
      setProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)])
      return project
    }

    return null
  }, [teamLogin])

  const createFolder = useCallback(async (projectId: string, payload: { name: string; description?: string; parent_id?: string | null }) => {
    if (!teamLogin) return null

    const { data } = await api.post(
      `/main/project/createFolder/?team_login=${teamLogin}`,
      toFormBody({ project_id: projectId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      return data.data as ProjectItem
    }

    return null
  }, [teamLogin])

  const renameItem = useCallback(async (itemId: string, name: string) => {
    if (!teamLogin) return null

    const { data } = await api.post(
      `/main/project/renameItem/?team_login=${teamLogin}`,
      toFormBody({ item_id: itemId, name }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      return data.data as ProjectItem
    }

    return null
  }, [teamLogin])

  const moveItem = useCallback(async (itemId: string, parentId?: string | null) => {
    if (!teamLogin) return null

    const { data } = await api.post(
      `/main/project/moveItem/?team_login=${teamLogin}`,
      toFormBody({ item_id: itemId, parent_id: parentId ?? "" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      return data.data as ProjectItem
    }

    return null
  }, [teamLogin])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!teamLogin) return false

    const { data } = await api.post(
      `/main/project/deleteItem/?team_login=${teamLogin}`,
      toFormBody({ item_id: itemId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    return data.status === true
  }, [teamLogin])

  const updateProject = useCallback(async (projectId: string, payload: { name?: string; description?: string; img_url?: string; is_archived?: boolean }) => {
    if (!teamLogin) {
      return null
    }

    const { data } = await api.post(
      `/main/project/update/?team_login=${teamLogin}`,
      toFormBody({ project_id: projectId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      const project = normalizeProject(data.data as ProjectInfo)
      setProjects((prev) => prev.map((item) => item.id === project.id ? project : item))
      return project
    }

    return null
  }, [teamLogin])

  const uploadProjectImage = useCallback(async (projectId: string, image: File) => {
    if (!teamLogin) {
      return null
    }

    const form = new FormData()
    form.append("project_id", projectId)
    form.append("image", image)

    const { data } = await api.post(`/main/project/uploadImage/?team_login=${teamLogin}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    if (data.status && data.data) {
      return data.data as ProjectDetail
    }

    return null
  }, [teamLogin])

  const resetProjectImage = useCallback(async (projectId: string) => {
    if (!teamLogin) {
      return null
    }

    const form = new URLSearchParams()
    form.append("project_id", projectId)

    const { data } = await api.post(`/main/project/resetImage/?team_login=${teamLogin}`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    if (data.status && data.data) {
      return data.data as ProjectDetail
    }

    return null
  }, [teamLogin])

  const deleteProject = useCallback(async (projectId: string) => {
    if (!teamLogin) {
      return false
    }

    const { data } = await api.post(
      `/main/project/delete/?team_login=${teamLogin}`,
      toFormBody({ project_id: projectId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status) {
      setProjects((prev) => prev.filter((item) => item.id !== projectId))
      return true
    }

    return false
  }, [teamLogin])

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false)
      return
    }

    refreshProjects()
  }, [refreshProjects, autoLoad])

  return useMemo(
    () => ({
      projects,
      loading,
      refreshProjects,
      getProject,
      createProject,
      updateProject,
      uploadProjectImage,
      resetProjectImage,
      deleteProject,
      createFolder,
      renameItem,
      moveItem,
      deleteItem,
    }),
    [projects, loading, refreshProjects, getProject, createProject, updateProject, uploadProjectImage, resetProjectImage, deleteProject, createFolder, renameItem, moveItem, deleteItem]
  )
}
