import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { TeamLayout } from '@/components/layouts/team-layout'
import { LandingPage } from '@/pages/landing'
import { TeamsPage } from '@/pages/teams-select'
import { TeamDashboardPage } from '@/pages/team-dashboard'
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: 'forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: 'teams',
    element: <TeamsPage />,
  },
  {
    path: 'teams/:teamLogin',
    element: <TeamLayout />,
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
    element: <SettingsPage />,
  },
  {
    path: 'help',
    element: <HelpPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
