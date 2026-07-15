import { useCallback, useMemo } from "react"
import { api } from "@/lib/api"

export interface AiChatSummary {
  id: string
  team_id: string
  title: string
  is_public: boolean
  draft_text: string
  last_message_preview: string
  last_message_role: string | null
  messages_count: number
  created_at: string | null
  updated_at: string | null
}

export interface AiChatDetail {
  id: string
  team_id: string
  title: string
  is_public: boolean
  draft_text: string
  is_deleted: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AiChatMessage {
  id: string
  chat_id: string
  role: "user" | "assistant" | string
  content: string
  meta: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

export interface AiChatPayload {
  chat: AiChatDetail
  messages: AiChatMessage[]
}

export interface AiAgentAction {
  type: string
  text: string
}

export interface AiAgentSendResponse extends AiChatPayload {
  actions: AiAgentAction[]
  quick_replies: string[]
  assistant_kind: string
}

function toFormBody(payload: Record<string, string | number | boolean | undefined | null>) {
  const form = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

export function useAiChats(teamLogin?: string) {
  const listChats = useCallback(async (): Promise<AiChatSummary[]> => {
    if (!teamLogin) return []

    try {
      const { data } = await api.get(`/main/ai/listChats/?team_login=${teamLogin}`)
      if (data.status && Array.isArray(data.data)) {
        return data.data as AiChatSummary[]
      }
    } catch (error) {
      console.error("Failed to fetch AI chats:", error)
    }

    return []
  }, [teamLogin])

  const createChat = useCallback(async (): Promise<AiChatSummary | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.post(
        `/main/ai/createChat/?team_login=${teamLogin}`,
        toFormBody({}),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      if (data.status && data.data) {
        return data.data as AiChatSummary
      }
    } catch (error) {
      console.error("Failed to create AI chat:", error)
    }

    return null
  }, [teamLogin])

  const getChat = useCallback(async (chatId: string): Promise<AiChatPayload | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.get(`/main/ai/getChat/?team_login=${teamLogin}&chat_id=${chatId}`)
      if (data.status && data.data?.chat) {
        return data.data as AiChatPayload
      }
    } catch (error) {
      console.error("Failed to fetch AI chat:", error)
    }

    return null
  }, [teamLogin])

  const saveDraft = useCallback(async (chatId: string, draftText: string) => {
    if (!teamLogin) return false

    try {
      const { data } = await api.post(
        `/main/ai/saveDraft/?team_login=${teamLogin}`,
        toFormBody({ chat_id: chatId, draft_text: draftText }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      return data.status === true
    } catch (error) {
      console.error("Failed to save AI draft:", error)
      return false
    }
  }, [teamLogin])

  const togglePublic = useCallback(async (chatId: string, isPublic: boolean): Promise<AiChatDetail | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.post(
        `/main/ai/togglePublic/?team_login=${teamLogin}`,
        toFormBody({ chat_id: chatId, is_public: isPublic }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      if (data.status && data.data) {
        return data.data as AiChatDetail
      }
    } catch (error) {
      console.error("Failed to toggle AI chat public state:", error)
    }

    return null
  }, [teamLogin])

  const renameChat = useCallback(async (chatId: string, title: string): Promise<AiChatDetail | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.post(
        `/main/ai/rename/?team_login=${teamLogin}`,
        toFormBody({ chat_id: chatId, title }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      if (data.status && data.data) {
        return data.data as AiChatDetail
      }
    } catch (error) {
      console.error("Failed to rename AI chat:", error)
    }

    return null
  }, [teamLogin])

  const deleteChat = useCallback(async (chatId: string) => {
    if (!teamLogin) return false

    try {
      const { data } = await api.post(
        `/main/ai/delete/?team_login=${teamLogin}`,
        toFormBody({ chat_id: chatId }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      return data.status === true
    } catch (error) {
      console.error("Failed to delete AI chat:", error)
      return false
    }
  }, [teamLogin])

  const sendMessage = useCallback(async (chatId: string, content: string): Promise<AiAgentSendResponse | null> => {
    if (!teamLogin) return null

    try {
      const { data } = await api.post(
        `/main/ai/sendMessage/?team_login=${teamLogin}`,
        toFormBody({ chat_id: chatId, content }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )

      if (data.status && data.data?.chat) {
        return data.data as AiAgentSendResponse
      }
    } catch (error) {
      console.error("Failed to send AI message:", error)
    }

    return null
  }, [teamLogin])

  return useMemo(
    () => ({
      listChats,
      createChat,
      getChat,
      saveDraft,
      togglePublic,
      renameChat,
      deleteChat,
      sendMessage,
    }),
    [listChats, createChat, getChat, saveDraft, togglePublic, renameChat, deleteChat, sendMessage]
  )
}
