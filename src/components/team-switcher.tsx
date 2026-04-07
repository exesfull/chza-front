import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { ChevronsUpDown, Plus, ArrowUpDown, ArrowUpAZ, ArrowUpZA, CalendarArrowDown, CalendarArrowUp } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTeams, sortTeams, type SortBy, formatJoinedDate } from "@/hooks/use-teams"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TeamSwitcher() {
  const { isMobile, state } = useSidebar()
  const { teams, loading, activeTeam, setActiveTeam, teamMembership } = useTeams()
  const navigate = useNavigate()
  const location = useLocation()
  const [sortBy, setSortBy] = useState<SortBy>("name_asc")
  const [sortOpen, setSortOpen] = useState(false)

  const sortedTeams = sortTeams(teams, sortBy)
  const isCollapsed = state === "collapsed"

  // Show skeleton while teams or membership data is loading
  if (loading || !teamMembership) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-8 w-full items-center gap-2 rounded-md px-2 animate-pulse">
            <div className="size-8 shrink-0 rounded-lg bg-muted" />
            {!isCollapsed && (
              <>
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="ml-auto size-4 rounded bg-muted" />
              </>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Use membership data for current team display (title + img_url from API)
  const membershipTeam = teamMembership?.team
  const current = membershipTeam
    ? { id: membershipTeam.id, name: membershipTeam.title, img_url: membershipTeam.img_url, joined_at: "" }
    : activeTeam || sortedTeams[0] || null

  if (!current) {
    return null
  }

  const handleSelectTeam = (team: typeof current) => {
    setActiveTeam(team)
    navigate(`/teams/${team.id}`)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                <Avatar className="size-full">
                  <AvatarImage src={current.img_url} />
                  <AvatarFallback className="text-xs rounded-lg">
                    {current.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{current.name}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Sort controls */}
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs text-muted-foreground">Команды ({teams.length})</span>
              <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ArrowUpDown className="size-3" />
                    Сортировка
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                    <DropdownMenuRadioItem value="name_asc">
                      <ArrowUpAZ className="mr-2 size-3.5" />
                      Название (А-Я)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">
                      <ArrowUpZA className="mr-2 size-3.5" />
                      Название (Я-А)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date_desc">
                      <CalendarArrowDown className="mr-2 size-3.5" />
                      Дата добавления (новые)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date_asc">
                      <CalendarArrowUp className="mr-2 size-3.5" />
                      Дата добавления (старые)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DropdownMenuSeparator />
            {sortedTeams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border overflow-hidden">
                  <Avatar className="size-full">
                    <AvatarImage src={team.img_url} />
                    <AvatarFallback className="text-[10px]">
                      {team.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="truncate">{team.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => navigate("/teams")}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Все команды</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
