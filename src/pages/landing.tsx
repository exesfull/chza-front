import { useEffect } from "react"
import { ArrowRight, CheckCircle2, Layers3, MessageSquare, ShieldCheck, Sparkles, Users } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

const features = [
  {
    title: "Команды и проекты",
    description: "Управление работой команды, проектами, задачами, досками и календарём в одном месте.",
    icon: Layers3,
  },
  {
    title: "Техподдержка",
    description: "Общение с поддержкой прямо в интерфейсе, без лишних переходов и форм.",
    icon: MessageSquare,
  },
  {
    title: "Безопасный доступ",
    description: "Вход через Exesfull-ID с контрольным доступом и разделением прав.",
    icon: ShieldCheck,
  },
]

const stats = [
  { label: "Команд", value: "1+" },
  { label: "Сервисов", value: "5+" },
  { label: "Инструментов", value: "10+" },
]

export function LandingPage() {
  const { user, loading } = useUser()

  useEffect(() => {
    document.title = "Чисто Задачи"
  }, [])

  const startAuth = async () => {
    try {
      const response = await fetch("/api/esm/eid/start/", {
        method: "GET",
        credentials: "include",
      })
      const payload = await response.json()
      const url = payload?.data?.url
      if (payload?.status && url) {
        window.location.replace(url)
      }
    } catch (error) {
      console.error("Failed to start SSO:", error)
    }
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.98))] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] dark:text-slate-50">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-3xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Чисто Задачи</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Платформа для командной работы</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/teams">
                  Войти в систему
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={startAuth} disabled={loading}>
                Войти через Exesfull-ID
                <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
          </div>
        </header>

        <main className="flex flex-1 items-center py-10 lg:py-16">
          <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <section className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Управление задачами, проектами и командами
              </div>

              <div className="max-w-3xl space-y-5">
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Рабочее пространство для команды, а не просто список задач
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  Проекты, списки задач, доски, календарь, файлы, виджеты и техподдержка в одном сервисе.
                  Вход через Exesfull-ID и удобный доступ для всей команды.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {user ? (
                  <Button asChild size="lg" className="rounded-2xl px-6">
                    <Link to="/teams">
                      Перейти в команды
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button onClick={startAuth} size="lg" className="rounded-2xl px-6" disabled={loading}>
                    Войти через Exesfull-ID
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                )}
                <Button asChild variant="outline" size="lg" className="rounded-2xl px-6">
                  <Link to="/help">Открыть помощь</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-3xl border bg-white/75 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-2xl font-bold">{item.value}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border bg-white/80 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Что внутри</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Всё для работы команды в одном интерфейсе</div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {features.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <div key={feature.title} className="flex items-start gap-3 rounded-2xl border bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold">{feature.title}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {feature.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-3xl border border-dashed bg-primary/5 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  После входа вы сразу попадёте в команды и сможете работать с задачами, проектами и поддержкой.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
