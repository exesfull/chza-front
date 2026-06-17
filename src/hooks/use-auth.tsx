import { createContext, useContext, useState, type ReactNode } from "react"
import { api } from "@/lib/api"

interface AuthContextType {
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.post("/v1/m_a/checkPassword", {
        email,
        password,
      })

      if (response.data.status === true) {
        setIsLoggedIn(true)
        return true
      }
      return false
    } catch (error) {
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem("auth_redirect_url")
    window.location.href = "/"
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}