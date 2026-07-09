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
  defaultOpen?: boolean
  adminOnly?: boolean
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    exact?: boolean
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
    title: "AI агент",
    url: "aiagent",
    icon: Bot,
  },
  {
    title: "separator",
    url: "",
  },
  {
    title: "Управление командой",
    url: "admin",
    icon: Shield,
    isActive: false,
    adminOnly: true,
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

  const isProjectsPage =
    location.pathname === `/teams/${teamLogin}/projects` ||
    location.pathname === `/teams/${teamLogin}/projects/`
  const hasBoardRoute = Boolean(boardId || location.pathname.includes("/boards/"))
  const hasListRoute = Boolean(listId || location.pathname.includes("/tasks/"))
  const currentObject = activeProject
    ? hasBoardRoute
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
    : null

  const activeProjectItem = activeProject
    ? {
        title: activeProject.name,
        url: `projects/${activeProject.id}`,
        icon: FolderKanban,
        isActive: false,
        defaultOpen: Boolean(location.pathname.includes(`/projects/${activeProject.id}`)),
        items: [
          {
            title: "Главная",
            url: `projects/${activeProject.id}`,
            icon: LayoutDashboard,
            exact: true,
          },
          ...(currentObject ? [currentObject] : []),
        ],
      }
    : null

  const navWithProject = navMain.flatMap((item) => {
    if (item.title === "Проекты" && activeProjectItem) {
      return [
        {
          ...item,
          isActive: isProjectsPage,
        },
        activeProjectItem,
      ]
    }
    return [item]
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
