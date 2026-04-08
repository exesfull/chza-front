import { useEffect, useState, useRef } from "react"
import { Outlet, useParams } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTeams } from "@/hooks/use-teams"
import { Badge } from "@/components/ui/badge"
import { Archive } from "lucide-react"

function Skeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex h-32 flex-col gap-3 rounded-xl border p-6">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-64 rounded-xl border bg-muted" />
    </div>
  )
}

export function TeamLayout() {
  const { teamLogin } = useParams()
  const { teams, setActiveTeam, checkTeamMembership, teamMembership } = useTeams()
  const [switching, setSwitching] = useState(false)
  const lastCheckedTeamLogin = useRef<string | null>(null)

  useEffect(() => {
    if (teamLogin && teamLogin !== lastCheckedTeamLogin.current) {
      setSwitching(true)
      lastCheckedTeamLogin.current = teamLogin
      checkTeamMembership(teamLogin).finally(() => {
        setSwitching(false)
      })
      const team = teams.find((t) => t.login === teamLogin)
      if (team) {
        setActiveTeam(team)
      }
    }
  }, [teamLogin, teams, setActiveTeam, checkTeamMembership])

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background/90 px-4 transition-[width,height] ease-linear lg:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
            </div>
            <div className="flex items-center gap-2">
              {teamMembership?.team?.is_archived && (
                <Badge variant="outline" className="gap-1 border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Archive className="size-3" />
                  Архивная команда
                </Badge>
              )}
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col overflow-hidden">
            {switching ? <Skeleton /> : <Outlet />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
