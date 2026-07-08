"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { useLocation, useParams } from "react-router-dom"

import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Link2,
  CalendarDays,
  Bot,
  Shield,
  SquareStack,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavFooter } from "@/components/nav-footer"
import { TeamSwitcher } from "@/components/team-switcher"
import { useTeams } from "@/hooks/use-teams"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  adminOnly?: boolean
  items?: {
    title: string
    url: string
  }[]
}

const navMainBase: NavItem[] = [
  {
    title: "Главная",
    url: ".",
    icon: LayoutDashboard,
  },
  {
    title: "Проекты",
    url: "projects",
    icon: FolderKanban,
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
    url: "",
  },
  {
    title: "AI агент",
    url: "aiagent",
    icon: Bot,
  },
  {
    title: "separator",
    url: "",
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
  const { teamLogin, projectId: routeProjectId, boardId, listId } = useParams()
  const location = useLocation()
  const { getProject } = useProjects(teamLogin, { autoLoad: false })
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null)

  const sidebarProjectId = useMemo(() => {
    if (routeProjectId) return routeProjectId
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get("project_id") || null
  }, [location.search, routeProjectId])

  useEffect(() => {
    let cancelled = false

    if (!sidebarProjectId) {
      setActiveProject(null)
      return
    }

    getProject(sidebarProjectId).then((project) => {
      if (!cancelled) {
        setActiveProject(project)
      }
    })

    return () => {
      cancelled = true
    }
  }, [sidebarProjectId, getProject])

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
    }) as NavItem[]

  const navWithProject = navMain.map((item) => {
    if (item.title !== "Проекты" || !activeProject) {
      return item
    }

    const hasBoardRoute = Boolean(boardId || location.pathname.includes("/boards/"))
    const hasListRoute = Boolean(listId || location.pathname.includes("/tasks/"))
    const currentObject = hasBoardRoute
      ? {
          title: activeProject.boards?.find((board) => board.id === boardId)?.name || "Открытая доска",
          url: boardId ? `projects/${activeProject.id}/boards/${boardId}` : `projects/${activeProject.id}`,
          icon: SquareStack,
        }
      : hasListRoute
        ? {
            title: activeProject.task_lists?.find((list) => list.id === listId)?.name || "Открытый список",
            url: listId ? `projects/${activeProject.id}/tasks/${listId}` : `projects/${activeProject.id}`,
            icon: ListTodo,
          }
        : null

    return {
      ...item,
      isActive: true,
      items: [
        {
          title: activeProject.name,
          url: `projects/${activeProject.id}`,
          icon: FolderKanban,
        },
        {
          title: "Главная",
          url: `projects/${activeProject.id}`,
          icon: LayoutDashboard,
        },
        ...(currentObject ? [currentObject] : []),
      ],
    }
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navWithProject} />
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
