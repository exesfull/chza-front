import { useCallback, useMemo } from "react"
import { api } from "@/lib/api"

export interface SupportUser {
  id: string
  first_name: string
  last_name: string
  patronymic?: string | null
  email: string
  img_url: string | null
  exesfull_id?: number | null
}

export interface SupportTeam {
  id: string
  name: string
  login: string
  img_url: string | null
}

export interface SupportTicket {
  id: string
  user_id: string
  team_id: string | null
  subject: string | null
  status: string
  closed_at: string | null
  updated_at: string | null
  created_at: string | null
  last_message_preview?: string
  last_message_role?: string | null
  user?: SupportUser | null
}

export interface SupportMessage {
  id: string
  ticket_id: string
  user_id: string | null
  role: string
  content: string
  meta: Record<string, unknown> | null
  visible_to_user: boolean
  created_at: string | null
  updated_at: string | null
}

export interface SupportTicketPayload {
  ticket: SupportTicket | null
  messages: SupportMessage[]
  user?: SupportUser | null
  teams?: SupportTeam[]
}

function toFormBody(payload: Record<string, string | number | boolean | undefined | null>) {
  const form = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

export function useSupport() {
  const listTickets = useCallback(async (): Promise<SupportTicket[]> => {
    try {
      const { data } = await api.get("/support/listTickets/")
      if (data.status && Array.isArray(data.data)) {
        return data.data as SupportTicket[]
      }
    } catch (error) {
      console.error("Failed to fetch support tickets:", error)
    }
    return []
  }, [])

  const getTicket = useCallback(async (ticketId?: string | null): Promise<SupportTicketPayload | null> => {
    try {
      const { data } = await api.get("/support/getTicket/", {
        params: ticketId ? { ticket_id: ticketId } : undefined,
      })
      if (data.status) {
        return data.data as SupportTicketPayload
      }
    } catch (error) {
      console.error("Failed to fetch support ticket:", error)
    }
    return null
  }, [])

  const sendMessage = useCallback(async (content: string, ticketId?: string | null): Promise<SupportTicketPayload | null> => {
    try {
      const { data } = await api.post(
        "/support/sendMessage/",
        toFormBody({ ticket_id: ticketId ?? "", content }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      if (data.status && data.data) {
        return data.data as SupportTicketPayload
      }
    } catch (error) {
      console.error("Failed to send support message:", error)
    }
    return null
  }, [])

  const closeTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      const { data } = await api.post(
        "/support/closeTicket/",
        toFormBody({ ticket_id: ticketId }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      return data.status === true
    } catch (error) {
      console.error("Failed to close support ticket:", error)
      return false
    }
  }, [])

  return useMemo(() => ({
    listTickets,
    getTicket,
    sendMessage,
    closeTicket,
  }), [listTickets, getTicket, sendMessage, closeTicket])
}
