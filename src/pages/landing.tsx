import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { CheckCircle, ArrowRight, Zap, Users, Calendar, Link2 } from "lucide-react"

export function LandingPage() {
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
        <Button asChild>
          <Link to="/teams">
            Войти
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Командный трекер
              <br />
              <span className="text-primary">без лишнего шума</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Простой и понятный инструмент для управления задачами вашей команды.
              Минимум настроек — максимум продуктивности.
            </p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" asChild>
              <Link to="/teams">
                Начать работу
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t px-6 py-16">
          <h2 className="mb-10 text-center text-3xl font-bold">Возможности</h2>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="size-6" />
              </div>
              <h3 className="text-xl font-semibold">Задачи</h3>
              <p className="text-sm text-muted-foreground">
                Создавайте, назначайте и отслеживайте задачи. Устанавливайте цели и лимиты.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-6" />
              </div>
              <h3 className="text-xl font-semibold">Команды</h3>
              <p className="text-sm text-muted-foreground">
                Управляйте участниками, назначайте роли и приглашайте новых членов команды.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="size-6" />
              </div>
              <h3 className="text-xl font-semibold">Календарь</h3>
              <p className="text-sm text-muted-foreground">
                Планируйте события и дедлайны. Визуальный обзор важных дат.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Link2 className="size-6" />
              </div>
              <h3 className="text-xl font-semibold">Ссылки</h3>
              <p className="text-sm text-muted-foreground">
                Храните полезные ссылки в одном месте. Группировка и быстрый поиск.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Готовы начать?</h2>
            <p className="mb-6 text-muted-foreground">
              Присоединяйтесь к команде или создайте свою собственную.
            </p>
            <Button size="lg" asChild>
              <Link to="/teams">
                Перейти к командам
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>
    </div>
  )
}
