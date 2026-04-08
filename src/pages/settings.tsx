import { Link, useLocation } from "react-router-dom"
import { Settings as SettingsIcon, HelpCircle, CheckCircle, Users } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

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
    icon: SettingsIcon,
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
    <nav className="flex items-center gap-1 border-b bg-muted/50 px-6 py-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.url
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

export function SettingsPage() {
  const { user } = useUser()

  const displayName = user
    ? `${user.last_name} ${user.first_name}`
    : "Пользователь"
  const displayEmail = user?.email || ""
  const displayAvatar = user?.img_url || ""
  const initials = user
    ? `${user.last_name?.[0] ?? ""}${user.first_name?.[0] ?? ""}`.toUpperCase()
    : "П"

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckCircle className="size-5" />
          </div>
          <span className="text-lg font-bold">Чисто Задачи</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">{displayEmail}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "https://id.exesfull.com/oauth/logout/"}>
            Выйти
          </Button>
        </div>
      </header>

      {/* Top navigation */}
      <TopNav />

      {/* Page content */}
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-sm text-muted-foreground">Настройки приложения и профиля</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Профиль</h3>
            <p className="text-sm text-muted-foreground">Управление данными профиля</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Уведомления</h3>
            <p className="text-sm text-muted-foreground">Настройка уведомлений</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Безопасность</h3>
            <p className="text-sm text-muted-foreground">Пароль и двухфакторная аутентификация</p>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>
    </div>
  )
}
