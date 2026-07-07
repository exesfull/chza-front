import { useEffect, useRef } from "react"
import { LoaderCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"

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
      return
    }

    startedRef.current = true

    fetch("/api/esm/eid/start/", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        const url = payload?.data?.url
        if (payload?.status && url) {
          window.location.replace(url)
          return
        }

        throw new Error(payload?.error || "redirect_url_missing")
      })
      .catch((error) => {
        console.error("Failed to start SSO:", error)
      })
  }, [loading, user])

  return (
    <div className="flex min-h-svh items-center justify-center bg-white px-6 text-slate-900 dark:bg-white dark:text-slate-900">
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
