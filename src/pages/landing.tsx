import { useEffect, useRef } from "react"
import { LoaderCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { buildSsoStartUrl, clearSsoStateCookie, generateSsoState, setSsoStateCookie } from "@/lib/sso"

export function LandingPage() {
  const { user, loading } = useUser()
  const startedRef = useRef(false)

  useEffect(() => {
    document.title = "Авторизация"
  }, [])

  useEffect(() => {
    if (loading || startedRef.current) {
      return
    }

    if (user) {
      window.location.replace(new URL("teams", window.location.href).toString())
      return
    }

    startedRef.current = true
    clearSsoStateCookie()
    const state = generateSsoState()
    setSsoStateCookie(state)
    window.location.replace(buildSsoStartUrl(state))
  }, [loading, user])

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <LoaderCircle className="size-10 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Подключение к Exesfull-ID</p>
          <p className="text-xs text-muted-foreground">Идёт проверка авторизации</p>
        </div>
      </div>
    </div>
  )
}
