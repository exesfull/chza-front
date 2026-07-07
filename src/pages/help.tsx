import { Link, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { Settings, HelpCircle, CheckCircle, Users } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/user-menu"

const navItems = [
  {
    title: "Главная",
    url: "/",
    icon: CheckCircle,
  },
  {
    title: "Мои команды",
    url: "/teams",
    icon: Users,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Помощь",
    url: "/help",
    icon: HelpCircle,
  },
]

function TopNav() {
  const location = useLocation()

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b bg-muted/50 px-4 py-2 sm:px-6">
      {navItems.map((item) => {
        const isActive = location.pathname === item.url
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs sm:text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function HelpPage() {
  useEffect(() => {
    document.title = "Помощь"
  }, [])

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckCircle className="size-5" />
          </div>
          <span className="text-lg font-bold hidden sm:inline">Чисто Задачи</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Top navigation */}
      <TopNav />

      {/* Page content */}
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Помощь</h1>
          <p className="text-sm text-muted-foreground">Документация и поддержка</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Документация</h3>
            <p className="text-sm text-muted-foreground">Руководства и примеры использования</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">FAQ</h3>
            <p className="text-sm text-muted-foreground">Часто задаваемые вопросы</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Поддержка</h3>
            <p className="text-sm text-muted-foreground">Связаться с нами</p>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>
    </div>
  )
}
