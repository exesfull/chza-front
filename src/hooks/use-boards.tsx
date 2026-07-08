import { useCallback, useMemo } from "react"
import { api } from "@/lib/api"

export interface BoardInfo {
  id: string
  project_id: string
  name: string
  description: string | null
  img_url: string | null
  is_deleted: boolean
  objects_count: number
  created_at: string | null
  updated_at: string | null
}

export interface BoardSceneData {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export interface BoardDetail {
  board: BoardInfo
  initialData: BoardSceneData | null
}

function toFormBody(payload: Record<string, string | number | boolean | undefined | null>) {
  const form = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

export function useBoards(teamLogin?: string) {
  const listBoards = useCallback(async (projectId: string): Promise<BoardInfo[]> => {
    if (!teamLogin) return []

    try {
      const { data } = await api.get(`/main/board/list/?team_login=${teamLogin}&project_id=${projectId}`)
      if (data.status && Array.isArray(data.data)) {
        return data.data as BoardInfo[]
      }
    } catch (error) {
      console.error("Failed to fetch boards:", error)
    }

    return []
  }, [teamLogin])

  const getBoard = useCallback(async (boardId: string): Promise<BoardDetail | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.get(`/main/board/get/?team_login=${teamLogin}&board_id=${boardId}`)
      if (data.status && data.data?.board) {
        return data.data as BoardDetail
      }
    } catch (error) {
      console.error("Failed to fetch board:", error)
    }

    return null
  }, [teamLogin])

  const createBoard = useCallback(async (projectId: string, payload: { name: string; description?: string; parent_id?: string | null }) => {
    if (!teamLogin) return null

    const { data } = await api.post(
      `/main/board/create/?team_login=${teamLogin}`,
      toFormBody({ project_id: projectId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      return data.data as BoardInfo
    }

    return null
  }, [teamLogin])

  const updateBoard = useCallback(async (boardId: string, payload: { name?: string; description?: string; img_url?: string; is_deleted?: boolean }) => {
    if (!teamLogin) return null

    const { data } = await api.post(
      `/main/board/update/?team_login=${teamLogin}`,
      toFormBody({ board_id: boardId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    if (data.status && data.data) {
      return data.data as BoardInfo
    }

    return null
  }, [teamLogin])

  const deleteBoard = useCallback(async (boardId: string) => {
    if (!teamLogin) return false

    const { data } = await api.post(
      `/main/board/delete/?team_login=${teamLogin}`,
      toFormBody({ board_id: boardId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    return data.status === true
  }, [teamLogin])

  const saveScene = useCallback(async (boardId: string, sceneJson: string) => {
    if (!teamLogin) return false

    const { data } = await api.post(
      `/main/board/saveScene/?team_login=${teamLogin}`,
      toFormBody({ board_id: boardId, scene_json: sceneJson }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    return data.status === true
  }, [teamLogin])

  return useMemo(() => ({
    listBoards,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    saveScene,
  }), [listBoards, getBoard, createBoard, updateBoard, deleteBoard, saveScene])
}
