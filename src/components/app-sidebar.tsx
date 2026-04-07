"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ListTodo,
  Link2,
  CalendarDays,
  Shield,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavFooter } from "@/components/nav-footer"
import { TeamSwitcher } from "@/components/team-switcher"
import { useTeams } from "@/hooks/use-teams"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMainBase = [
  {
    title: "Главная",
    url: ".",
    icon: LayoutDashboard,
  },
  {
    title: "Задачи",
    url: "tasks",
    icon: ListTodo,
  },
  {
    title: "Ссылки",
    url: "links",
    icon: Link2,
  },
  {
    title: "Календарь",
    url: "calendar",
    icon: CalendarDays,
  },
  {
    title: "separator",
  },
  {
    title: "Управление",
    url: "/management/general",
    icon: Shield,
    isActive: false,
    adminOnly: true,
    items: [
      {
        title: "Основное",
        url: "/management/general",
      },
      {
        title: "Список участников",
        url: "/management/members",
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin } = useTeams()

  const navMain = navMainBase
    .filter((item, idx) => {
      if (item.adminOnly && !isAdmin) return false
      if (item.title === "separator") {
        const nextItem = navMainBase[idx + 1]
        if (nextItem?.adminOnly && !isAdmin) return false
        const prevItem = navMainBase[idx - 1]
        if (prevItem?.title === "separator") return false
      }
      return true
    })
    .map(({ adminOnly, ...rest }) => rest)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <div className="mt-auto">
          <NavFooter />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
