import { createBrowserRouter, Navigate, RouterProvider, useLocation, type RouteObject } from 'react-router-dom'
import * as React from 'react'
import { TeamLayout } from '@/components/layouts/team-layout'
import { LandingPage } from '@/pages/landing'
import { TeamsPage } from '@/pages/teams-select'
import { TeamDashboardPage } from '@/pages/team-dashboard'
import { ProjectsPage } from '@/pages/projects'
import { ProjectPage } from '@/pages/project-detail'
import { ProjectSettingsPage } from '@/pages/project-settings'
import { BoardPage } from '@/pages/board-detail'
import { TasksPage } from '@/pages/tasks'
import { TaskBoardPage } from '@/pages/task-board'
import { LinksPage } from '@/pages/links'
import { CalendarPage } from '@/pages/calendar'
import { SettingsPage } from '@/pages/settings'
import { HelpPage } from '@/pages/help'
import { AiAgentPage } from '@/pages/aiagent'
import { ManagementGeneralPage } from '@/pages/management-general'
import { ManagementMembersPage } from '@/pages/management-members'
import { NotFoundPage } from '@/pages/not-found'
import { ForbiddenPage } from '@/pages/forbidden'
import { TeamAdminPage } from '@/pages/team-admin'
import { TeamInvitePage } from '@/pages/team-invite'
import { useUser } from '@/hooks/use-user'
import { LoaderCircle } from "lucide-react"

// Update document title on route change
function TitleUpdater() {
  const location = useLocation()
  React.useEffect(() => {
    if (location.pathname !== "/") {
      document.title = 'Чисто Задачи'
    }
  }, [location.pathname])
  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-white px-6 text-slate-900 dark:bg-white dark:text-slate-900">
        <LoaderCircle className="size-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    if (location.pathname.startsWith('/invite/')) {
      sessionStorage.setItem('pending_invite_path', location.pathname)
    }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <><TitleUpdater /><LandingPage /></>,
  },
  {
    path: 'forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: 'teams',
    element: (
      <ProtectedRoute>
        <TeamsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'invite/:token',
    element: (
      <ProtectedRoute>
        <TeamInvitePage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'teams/:teamLogin',
    element: (
      <ProtectedRoute>
        <TeamLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <TeamDashboardPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'tasks/:listId',
        element: <TaskBoardPage />,
      },
      {
        path: 'projects/:projectId/tasks/:listId',
        element: <TaskBoardPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'projects/:projectId',
        element: <ProjectPage />,
      },
      {
        path: 'projects/:projectId/settings',
        element: <ProjectSettingsPage />,
      },
      {
        path: 'projects/:projectId/boards/:boardId',
        element: <BoardPage />,
      },
      {
        path: 'links',
        element: <LinksPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'aiagent',
        element: <AiAgentPage />,
      },
      {
        path: 'aiagent/:chatId',
        element: <AiAgentPage />,
      },
      {
        path: 'admin',
        element: <TeamAdminPage />,
      },
      {
        path: 'management/general',
        element: <ManagementGeneralPage />,
      },
      {
        path: 'management/members',
        element: <ManagementMembersPage />,
      },
    ],
  },
  {
    path: 'settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'help',
    element: (
      <ProtectedRoute>
        <HelpPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'help/admin',
    element: (
      <ProtectedRoute>
        <HelpPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]

export const router = createBrowserRouter(routes)

export default function AppRouter() {
  return <RouterProvider router={router} />
}
