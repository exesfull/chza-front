import { useState, useEffect } from "react"
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
import { CheckCircle, Plus, Archive, Users, Settings, HelpCircle } from "lucide-react"
import { useTeams, sortTeams, type SortBy } from "@/hooks/use-teams"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/user-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"

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

export function TeamsPage() {
  const { teams, loading, activeTeam, refreshTeams } = useTeams()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortBy>("name_asc")
  const [createOpen, setCreateOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [teamDesc, setTeamDesc] = useState("")
  const [teamImg, setTeamImg] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  useEffect(() => {
    if (activeTeam) document.title = activeTeam.name;
    else document.title = "Мои команды"
  }, [activeTeam])

  const sortedTeams = sortTeams(teams, sortBy)

  const handleSelectTeam = (teamLogin: string) => {
    navigate(`/teams/${teamLogin}`)
  }

  const handleCreateTeam = async () => {
    const name = teamName.trim()
    if (!name) {
      setCreateError("Название команды обязательно")
      return
    }

    setCreating(true)
    setCreateError("")

    try {
      const body = new URLSearchParams()
      body.append("name", name)
      if (teamDesc.trim()) body.append("description", teamDesc.trim())
      if (teamImg.trim()) body.append("img_url", teamImg.trim())

      const { data } = await api.post("/main/team/create/", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      if (!data.status || !data.data?.team) {
        throw new Error(data?.error || "team_create_failed")
      }

      await refreshTeams()
      setCreateOpen(false)
      setTeamName("")
      setTeamDesc("")
      setTeamImg("")
      navigate(`/teams/${data.data.team.login}`)
    } catch (createTeamError) {
      console.error("Failed to create team:", createTeamError)
      setCreateError("Не удалось создать команду")
    } finally {
      setCreating(false)
    }
  }

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

      {/* Main */}
      <main className="flex flex-1 items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Мои команды</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {loading ? "Загрузка..." : `У вас ${teams.length} ${teams.length === 1 ? "команда" : teams.length < 5 ? "команды" : "команд"}`}
              </p>
            </div>
            <div className="w-full sm:w-48">
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
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">Создать команду</span>
              <span className="sm:hidden">Создать</span>
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => {}}>
              <Archive className="mr-2 size-4" />
              <span className="hidden sm:inline">Архивные команды</span>
              <span className="sm:hidden">Архив</span>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Создать команду</DialogTitle>
            <DialogDescription>Заполните данные новой команды</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Название *</label>
              <Input
                placeholder="Название команды"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea
                placeholder="Описание команды"
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Обложка</label>
              <Input
                placeholder="URL изображения"
                value={teamImg}
                onChange={(e) => setTeamImg(e.target.value)}
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()}>
              {creating ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
