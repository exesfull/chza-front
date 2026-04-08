import { useState } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, LogOut, Plus, Archive, Users, Settings, HelpCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { useTeams, sortTeams, type SortBy } from "@/hooks/use-teams"
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

export function TeamsPage() {
  const { user } = useUser()
  const { teams, loading } = useTeams()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortBy>("name_asc")

  const displayName = user
    ? `${user.last_name} ${user.first_name}`
    : "Пользователь"
  const displayEmail = user?.email || ""
  const displayAvatar = user?.img_url || ""
  const initials = user
    ? `${user.last_name?.[0] ?? ""}${user.first_name?.[0] ?? ""}`.toUpperCase()
    : "П"

  const sortedTeams = sortTeams(teams, sortBy)

  const handleSelectTeam = (teamLogin: string) => {
    navigate(`/teams/${teamLogin}`)
  }

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
            <LogOut className="mr-2 size-4" />
            Выйти
          </Button>
        </div>
      </header>

      {/* Top navigation */}
      <TopNav />

      {/* Main */}
      <main className="flex flex-1 items-start justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold">Мои команды</h1>
              <p className="mt-1 text-muted-foreground">
                {loading ? "Загрузка..." : `У вас ${teams.length} ${teams.length === 1 ? "команда" : teams.length < 5 ? "команды" : "команд"}`}
              </p>
            </div>
            <div className="w-48">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger>
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Название (А-Я)</SelectItem>
                  <SelectItem value="name_desc">Название (Я-А)</SelectItem>
                  <SelectItem value="date_desc">Дата (новые)</SelectItem>
                  <SelectItem value="date_asc">Дата (старые)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="size-12 rounded-full bg-muted" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : sortedTeams.length > 0 ? (
              sortedTeams.map((team) => (
                <Card
                  key={team.id}
                  className="cursor-pointer transition-colors hover:bg-muted"
                  onClick={() => handleSelectTeam(team.login)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-12 overflow-hidden rounded-lg">
                        <AvatarImage src={team.img_url} />
                        <AvatarFallback className="rounded-lg text-lg">
                          {team.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <CheckCircle className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">У вас пока нет команд</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Создайте свою первую команду или примите приглашение
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bottom buttons */}
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={() => {}}>
              <Plus className="mr-2 size-4" />
              Создать команду
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => {}}>
              <Archive className="mr-2 size-4" />
              Архивные команды
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>
    </div>
  )
}
