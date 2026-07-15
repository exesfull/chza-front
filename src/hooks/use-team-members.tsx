import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"

export interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  img_url: string
  is_admin: boolean
  status: string
}

export function useTeamMembers(teamLogin?: string) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const refreshMembers = useCallback(async () => {
    if (!teamLogin) {
      setMembers([])
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get(`/main/team/getMembers/?team_login=${teamLogin}`)
      if (data.status && Array.isArray(data.data)) {
        setMembers(data.data)
      } else {
        setMembers([])
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error("Failed to fetch team members:", error)
      }
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [teamLogin])

  useEffect(() => {
    refreshMembers()
  }, [refreshMembers])

  return useMemo(() => ({ members, loading, refreshMembers }), [members, loading, refreshMembers])
}
