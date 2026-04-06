import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { DashboardPage } from '@/pages/dashboard'
import { TasksPage } from '@/pages/tasks'
import { LinksPage } from '@/pages/links'
import { CalendarPage } from '@/pages/calendar'
import { NotFoundPage } from '@/pages/not-found'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
      },
      {
        path: 'links',
        element: <LinksPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
