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
    used_gb: activeTeam.storage_used_gb ?? 0,
    limit_gb: activeTeam.storage_limit_gb ?? 1,
    percent: activeTeam.storage_percent ?? 0,
  } : null)
  const usedGb = storage ? Number(storage.used_gb || 0) : 0
  const limitGb = storage ? Number(storage.limit_gb || 1) : 1
  const percent = storage ? Number(storage.percent || 0) : 0

  if (!teamMembership) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="mb-2 rounded-xl border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>0 ГБ</span>
                <span>1 ГБ</span>
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
              <span>{usedGb.toFixed(2).replace(/\.00$/, "")} ГБ</span>
              <span>{limitGb.toFixed(2).replace(/\.00$/, "")} ГБ</span>
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
