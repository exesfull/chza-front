import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react"
import { api } from "@/lib/api"

export interface TeamInfo {
  id: string
  name: string
  img_url: string
  joined_at: string
}

export interface TeamMembership {
  team: {
    id: string
    title: string
    img_url: string
    is_archived: boolean
  }
  membership: {
    status: string
    is_admin: boolean
  }
}

export type SortBy = "name_asc" | "name_desc" | "date_asc" | "date_desc"

interface TeamsContextType {
  teams: TeamInfo[]
  loading: boolean
  refreshTeams: () => Promise<void>
  activeTeam: TeamInfo | null
  setActiveTeam: (team: TeamInfo | null) => void
  teamMembership: TeamMembership | null
  checkTeamMembership: (teamId: string) => Promise<void>
  isAdmin: boolean
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined)

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTeam, setActiveTeam] = useState<TeamInfo | null>(null)
  const [teamMembership, setTeamMembership] = useState<TeamMembership | null>(null)

  const refreshTeams = async () => {
    try {
      const { data } = await api.get("/main/user/myTeams/")
      if (data.status && Array.isArray(data.data)) {
        setTeams(data.data)
        if (activeTeam) {
          const updated = data.data.find((t: TeamInfo) => t.id === activeTeam.id)
          if (updated) setActiveTeam(updated)
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkTeamMembership = useCallback(async (teamId: string) => {
    try {
      const { data } = await api.get(`/main/team/checkTeamMembership/?team_id=${teamId}`)
      if (data.status && data.data) {
        setTeamMembership(data.data)
      }
    } catch (error) {
      console.error("Failed to check team membership:", error)
    }
  }, [])

  useEffect(() => {
    refreshTeams()
  }, [])

  const isAdmin = teamMembership?.membership?.is_admin ?? false

  const value = useMemo(
    () => ({ teams, loading, refreshTeams, activeTeam, setActiveTeam, teamMembership, checkTeamMembership, isAdmin }),
    [teams, loading, activeTeam, teamMembership, isAdmin, checkTeamMembership]
  )

  return (
    <TeamsContext.Provider value={value}>
      {children}
    </TeamsContext.Provider>
  )
}

export function useTeams() {
  const context = useContext(TeamsContext)
  if (!context) {
    throw new Error("useTeams must be used within a TeamsProvider")
  }
  return context
}

export function formatJoinedDate(dateStr: string): string {
  if (!dateStr) return ""
  const normalized = dateStr.replace(" ", "T")
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

export function sortTeams(teams: TeamInfo[], sortBy: SortBy): TeamInfo[] {
  const sorted = [...teams]
  switch (sortBy) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"))
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "ru"))
    case "date_asc": {
      const parseDate = (d: string) => new Date(d.replace(" ", "T")).getTime()
      return sorted.sort((a, b) => parseDate(a.joined_at) - parseDate(b.joined_at))
    }
    case "date_desc": {
      const parseDate = (d: string) => new Date(d.replace(" ", "T")).getTime()
      return sorted.sort((a, b) => parseDate(b.joined_at) - parseDate(a.joined_at))
    }
    default:
      return sorted
  }
}
