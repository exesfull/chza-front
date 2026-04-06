"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  LayoutDashboard,
  ListTodo,
  Link2,
  CalendarDays,
  Users,
  Settings,
  HelpCircle,
  Shield,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavFooter } from "@/components/nav-footer"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const teams = [
  {
    name: "Acme Inc",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
]

const navMain = [
  {
    title: "Главная",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Задачи",
    url: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Ссылки",
    url: "/links",
    icon: Link2,
  },
  {
    title: "Календарь",
    url: "/calendar",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
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
