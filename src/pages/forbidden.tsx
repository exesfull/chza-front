import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { ShieldX, ArrowLeft } from "lucide-react"

export function ForbiddenPage() {
  useEffect(() => {
    document.title = "Доступ запрещён"
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <ShieldX className="size-10 text-destructive" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-6xl font-bold">403</h1>
        <h2 className="text-2xl font-medium">Нет доступа</h2>
        <p className="mx-auto max-w-sm text-muted-foreground">
          У вас нет прав для просмотра этой страницы. Обратитесь к администратору команды.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/teams">
            <ArrowLeft className="mr-2 size-4" />
            К выбору команды
          </Link>
        </Button>
        <Button asChild>
          <a href="https://id.exesfull.com/my/settings/">Настройки аккаунта</a>
        </Button>
      </div>
    </div>
  )
}
