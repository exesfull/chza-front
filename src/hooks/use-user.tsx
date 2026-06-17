import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  patronymic: string
  email: string
  img_url: string
  is_active: boolean
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const { loading: storedLoading } = useUserInternal()
  const { isLoggedIn } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(storedLoading)

  const refreshUser = async () => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get("/user/myInfo/")
      if (data.status && data.data) {
        setUser(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [isLoggedIn])

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

// Separate hook to avoid circular dependency
function useUserInternal() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/user/myInfo/")
      if (data.status && data.data) {
        setUser(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return { user, loading, refreshUser }
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
