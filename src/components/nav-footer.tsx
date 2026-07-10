import { Users, HelpCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeams } from "@/hooks/use-teams"

const footerItems = [
  {
    title: "Мои команды",
    url: "/teams",
    icon: Users,
  },
  {
    title: "Помощь",
    url: "/help",
    icon: HelpCircle,
  },
]

export function NavFooter() {
  const location = useLocation()
  const { teamMembership, activeTeam, storageUsage } = useTeams()
  const storage = storageUsage || (activeTeam ? {
    used_bytes: activeTeam.storage_used_bytes ?? 0,
    limit_bytes: activeTeam.storage_limit_bytes ?? Math.round((activeTeam.storage_limit_gb ?? 1) * 1000000000),
    percent: activeTeam.storage_percent ?? 0,
  } : null)
  const usedBytes = storage ? Number(storage.used_bytes || 0) : 0
  const limitBytes = storage ? Number(storage.limit_bytes || 1000000000) : 1000000000
  const percent = storage ? Number(storage.percent || 0) : 0

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} МБ`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(/\.0+$/, "").replace(/\.([1-9])0$/, ".$1")} ГБ`
  }

  if (!teamMembership) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="mb-2 rounded-xl border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatSize(usedBytes)}</span>
                <span>{formatSize(limitBytes)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-0 rounded-full bg-primary/70" />
              </div>
            </div>
          </SidebarMenuItem>
          {footerItems.map((_, i) => (
            <SidebarMenuItem key={i}>
              <div className="flex h-8 items-center gap-2 px-2 animate-pulse">
                <Skeleton className="size-4" />
                <Skeleton className="h-3 w-24" />
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="mb-2 rounded-xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatSize(usedBytes)}</span>
              <span>{formatSize(limitBytes)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
          </div>
        </SidebarMenuItem>
        {footerItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === item.url}
              className="w-full"
            >
              <Link to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
