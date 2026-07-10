import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export interface AdminTeam {
  id: string
  login: string
  name: string
  description: string | null
  img_url: string
  created_by: string
}

export interface AdminMember {
  id: string
  first_name: string
  last_name: string
  email: string
  img_url: string
  is_admin: boolean
  is_owner: boolean
  status: string
}

export interface TeamInvite {
  id: string
  name: string
  token: string
  max_uses: number | null
  uses_count: number
  is_active: boolean
  created_at: string
}

interface AdminData {
  team: AdminTeam
  members: AdminMember[]
  invites: TeamInvite[]
  usage: { tokens: number | null; storage_gb: number | null }
  stats: {
    projects: number
    links: number
    task_lists: number
    tasks: number
    boards: number
  }
}

export function useTeamAdmin(teamLogin?: string) {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    if (!teamLogin) return
    setLoading(true)
    try {
      const response = await api.get(`/main/team/getAdminData/?team_login=${teamLogin}`)
      setData(response.data.data)
      setError("")
    } catch {
      setError("Не удалось загрузить управление командой")
    } finally {
      setLoading(false)
    }
  }, [teamLogin])

  useEffect(() => { refresh() }, [refresh])

  const post = useCallback(async (method: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return false
    const body = new URLSearchParams()
    body.set("team_login", teamLogin)
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.set(key, String(value))
    })
    await api.post(`/main/team/${method}/?team_login=${teamLogin}`, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    await refresh()
    return true
  }, [refresh, teamLogin])

  return {
    data, loading, error, refresh,
    updateSettings: (payload: { name: string; description: string; img_url: string }) => post("updateSettings", payload),
    createInvite: (payload: { name: string; max_uses?: number }) => post("createInvite", payload),
    disableInvite: (inviteId: string) => post("disableInvite", { invite_id: inviteId }),
    setMemberAdmin: (userId: string, isAdmin: boolean) => post("setMemberAdmin", { user_id: userId, is_admin: isAdmin ? "1" : "0" }),
    removeMember: (userId: string) => post("removeMember", { user_id: userId }),
  }
}
