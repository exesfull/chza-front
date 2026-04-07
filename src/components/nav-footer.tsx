import { Users, Settings, HelpCircle } from "lucide-react"
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
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Помощь",
    url: "/help",
    icon: HelpCircle,
  },
]

export function NavFooter() {
  const location = useLocation()
  const { teamMembership } = useTeams()

  if (!teamMembership) {
    return (
      <SidebarGroup>
        <SidebarMenu>
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
