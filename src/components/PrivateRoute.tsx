import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import { ReactNode } from "react"

interface PrivateRouteProps {
  children: ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) {
    // Save current URL to localStorage before redirecting
    const currentPath = window.location.pathname + window.location.search
    localStorage.setItem("auth_redirect_url", currentPath)
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute