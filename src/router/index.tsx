import { createBrowserRouter, Navigate, RouterProvider, useLocation, type RouteObject } from 'react-router-dom'
import * as React from 'react'
import { TeamLayout } from '@/components/layouts/team-layout'
import { LandingPage } from '@/pages/landing'
import { TeamsPage } from '@/pages/teams-select'
import { TeamDashboardPage } from '@/pages/team-dashboard'
import { ProjectsPage } from '@/pages/projects'
import { ProjectPage } from '@/pages/project-detail'
import { ProjectSettingsPage } from '@/pages/project-settings'
import { TasksPage } from '@/pages/tasks'
import { TaskBoardPage } from '@/pages/task-board'
import { LinksPage } from '@/pages/links'
import { CalendarPage } from '@/pages/calendar'
import { SettingsPage } from '@/pages/settings'
import { HelpPage } from '@/pages/help'
import { ManagementGeneralPage } from '@/pages/management-general'
import { ManagementMembersPage } from '@/pages/management-members'
import { NotFoundPage } from '@/pages/not-found'
import { ForbiddenPage } from '@/pages/forbidden'
import { useUser } from '@/hooks/use-user'

// Update document title on route change
function TitleUpdater() {
  const location = useLocation()
  React.useEffect(() => {
    // Reset to default title, specific pages will override it
    document.title = 'Чисто Задачи'
  }, [location.pathname])
  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()

  if (loading) {
    return <LandingPage />
  }

  if (!user) {
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
        path: 'links',
        element: <LinksPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
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
    path: '*',
    element: <NotFoundPage />,
  },
]

export const router = createBrowserRouter(routes)

export default function AppRouter() {
  return <RouterProvider router={router} />
}
