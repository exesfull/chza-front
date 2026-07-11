import { Fragment, useEffect, useRef, useState, type ReactNode } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"
import {
  BookOpen,
  CheckCircle,
  Clock3,
  LoaderCircle,
  MessageSquare,
  Send,
  Sparkles,
  Tickets,
  Users,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { useSupport, type SupportMessage, type SupportTicket } from "@/hooks/use-support"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const docs = [
  {
    title: "Команды и роли",
    icon: Users,
    description: "Как создавать команды, приглашать участников и назначать роли.",
  },
  {
    title: "Проекты и задачи",
    icon: BookOpen,
    description: "Структура проектов, списков задач, досок, файлов и виджетов.",
  },
  {
    title: "Хранилище и файлы",
    icon: Sparkles,
    description: "Квоты, загрузки, превью, вложения и работа с медиа.",
  },
]

function formatTime(value: string | null): string {
  if (!value) return ""
  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let index = 0
  let key = 0

  const pushText = (value: string) => {
    if (value) nodes.push(<Fragment key={key++}>{value}</Fragment>)
  }

  while (index < text.length) {
    const rest = text.slice(index)
    const linkMatch = rest.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)
    if (linkMatch) {
      nodes.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
          {linkMatch[1]}
        </a>
      )
      index += linkMatch[0].length
      continue
    }
    const boldMatch = rest.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      nodes.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>)
      index += boldMatch[0].length
      continue
    }
    const next = rest.search(/[\[*`]/)
    if (next === -1) {
      pushText(rest)
      break
    }
    pushText(rest.slice(0, next))
    index += next
  }

  return nodes
}

function SupportBubble({ message }: { message: SupportMessage }) {
  const isSystem = message.role === "system"
  const isAdmin = message.role === "admin"
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "border border-amber-500/30 bg-amber-500/10 text-foreground"
              : isAdmin
                ? "border bg-card text-card-foreground"
                : "border bg-muted/30 text-card-foreground"
        )}
      >
        {isSystem && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Системное сообщение</div>}
        <div className="whitespace-pre-wrap leading-6">{renderInlineMarkdown(message.content)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{formatTime(message.created_at)}</div>
      </div>
    </div>
  )
}

function TopNav() {
  const location = useLocation()
  const items = [
    { title: "Главная", url: "/", icon: CheckCircle },
    { title: "Мои команды", url: "/teams", icon: Users },
    { title: "Помощь", url: "/help", icon: BookOpen },
  ]

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b bg-muted/50 px-4 py-2 sm:px-6">
      {items.map((item) => {
        const isActive = location.pathname === item.url
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs sm:text-sm font-medium transition-colors",
              isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
  const location = useLocation()
  const { user } = useUser()
  const { listTickets, getTicket, sendMessage, closeTicket } = useSupport()
  const isAdminRoute = location.pathname.endsWith("/help/admin")
  const isSuperAdmin = (user?.exesfull_id ?? 0) === 2

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([])
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketMeta, setTicketMeta] = useState<{ title: string; userName: string; userEmail: string; userAvatar: string | null; teams: Array<{ id: string; name: string; login: string; img_url: string | null }> }>({
    title: "Поддержка",
    userName: "",
    userEmail: "",
    userAvatar: null,
    teams: [],
  })
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const refreshTickets = async () => {
    const items = await listTickets()
    setTickets(items)
    setLoadingTickets(false)
    return items
  }

  const loadTicket = async (ticketId?: string | null) => {
    setTicketLoading(true)
    const payload = await getTicket(ticketId)
    if (payload) {
      setTicketMessages(payload.messages || [])
      setTicketMeta({
        title: payload.ticket?.subject || "Поддержка",
        userName: payload.user ? `${payload.user.last_name} ${payload.user.first_name}`.trim() : "",
        userEmail: payload.user?.email || "",
        userAvatar: payload.user?.img_url || null,
        teams: payload.teams || [],
      })
      if (payload.ticket?.id) {
        setActiveTicketId(payload.ticket.id)
      }
    } else {
      setTicketMessages([])
      setTicketMeta({
        title: "Поддержка",
        userName: "",
        userEmail: "",
        userAvatar: null,
        teams: [],
      })
    }
    setTicketLoading(false)
  }

  useEffect(() => {
    document.title = "Помощь"
  }, [])

  useEffect(() => {
    if (isAdminRoute && !isSuperAdmin) {
      return
    }
    setLoadingTickets(true)
    refreshTickets()
  }, [isAdminRoute, isSuperAdmin])

  useEffect(() => {
    if (isAdminRoute && !isSuperAdmin) return
    if (!isAdminRoute) {
      void loadTicket(null)
      return
    }
    if (!activeTicketId && tickets.length > 0) {
      setActiveTicketId(tickets[0].id)
    }
  }, [isAdminRoute, isSuperAdmin, tickets])

  useEffect(() => {
    if (isAdminRoute && !isSuperAdmin) return
    if (isAdminRoute) {
      if (!activeTicketId && tickets.length === 0) return
      if (activeTicketId) {
        void loadTicket(activeTicketId)
      }
    } else {
      void loadTicket(null)
    }
  }, [activeTicketId, isAdminRoute, isSuperAdmin])

  useEffect(() => {
    if (isAdminRoute && !isSuperAdmin) return
    const timer = window.setInterval(async () => {
      await refreshTickets()
      await loadTicket(isAdminRoute ? activeTicketId : null)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeTicketId, isAdminRoute, isSuperAdmin])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [ticketMessages.length, sending])

  const handleSend = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    const result = await sendMessage(draft.trim(), isAdminRoute ? activeTicketId : null)
    if (result) {
      setTicketMessages(result.messages || [])
      setDraft("")
      if (result.ticket?.id) {
        setActiveTicketId(result.ticket.id)
      }
      await refreshTickets()
    }
    setSending(false)
  }

  const handleCloseTicket = async () => {
    if (!activeTicketId) return
    const ok = await closeTicket(activeTicketId)
    if (ok) {
      await refreshTickets()
      await loadTicket(activeTicketId)
    }
  }

  if (isAdminRoute && !isSuperAdmin) {
    return <Navigate to="/help" replace />
  }

  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId) || null
  const openTickets = tickets.filter((ticket) => ticket.status !== "closed").length
  const closedTickets = tickets.filter((ticket) => ticket.status === "closed").length
  const supportTitle = isAdminRoute ? "Панель техподдержки" : "Техподдержка"

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckCircle className="size-5" />
          </div>
          <span className="hidden text-lg font-bold sm:inline">Чисто Задачи</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <TopNav />

      <main className="flex flex-1 justify-center px-4 py-6 md:px-6">
        <div className="flex w-full max-w-7xl flex-col gap-6">
          <section className="overflow-hidden rounded-[2rem] border bg-card/80 shadow-sm backdrop-blur">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative p-6 sm:p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10" />
                <div className="relative flex flex-col gap-4">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                    <Sparkles className="size-3.5 text-primary" />
                    Центр помощи и техподдержки
                  </div>
                  <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{supportTitle}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                      Здесь собрана документация по платформе, а ниже расположен чат поддержки. Можно быстро найти ответ в гайдах или сразу написать в техподдержку.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Документация</div>
                      <div className="mt-1 text-2xl font-bold">3</div>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Открытых тикетов</div>
                      <div className="mt-1 text-2xl font-bold">{openTickets}</div>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Закрытых тикетов</div>
                      <div className="mt-1 text-2xl font-bold">{closedTickets}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t bg-gradient-to-br from-muted/20 to-muted/50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-[1.5rem] border bg-background/80 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquare className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Быстрая поддержка</div>
                      <div className="text-sm text-muted-foreground">Сообщения, история и ответы без лишних окон.</div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
                    <div className="rounded-2xl border bg-muted/30 px-4 py-3">• Если ответ уже есть в документации, он будет доступен сверху.</div>
                    <div className="rounded-2xl border bg-muted/30 px-4 py-3">• Если нужна помощь, просто напишите сообщение в чат.</div>
                    <div className="rounded-2xl border bg-muted/30 px-4 py-3">• Админ видит тикеты пользователей, команды и системные события.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {docs.map((doc) => {
              const Icon = doc.icon
              return (
                <div key={doc.title} className="rounded-[1.75rem] border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{doc.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          <div className={cn("grid gap-6", isAdminRoute ? "xl:grid-cols-[360px_1fr]" : "xl:grid-cols-[1fr]")}>
            {isAdminRoute && (
              <section className="rounded-[2rem] border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">Тикеты поддержки</div>
                    <div className="text-xs text-muted-foreground">{tickets.length} диалогов</div>
                  </div>
                  <Tickets className="size-4 text-muted-foreground" />
                </div>
                <div className="h-[620px] overflow-y-auto p-2">
                  {loadingTickets ? (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl border bg-muted/30" />
                      ))}
                    </div>
                  ) : tickets.length > 0 ? (
                    tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setActiveTicketId(ticket.id)}
                        className={cn(
                          "mb-2 w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50",
                          activeTicketId === ticket.id && "border-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                            <MessageSquare className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate font-medium">
                                {ticket.user?.last_name} {ticket.user?.first_name}
                              </div>
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                ticket.status === "closed" ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {ticket.status === "closed" ? "Закрыт" : "Открыт"}
                              </span>
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {ticket.last_message_preview || "Нет сообщений"}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{ticket.subject || "Поддержка"}</span>
                              <span className="flex items-center gap-1"><Clock3 className="size-3" />{formatTime(ticket.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                      Пока нет тикетов.
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {activeTicket?.subject || ticketMeta.title || "Техподдержка"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isAdminRoute
                      ? ticketMeta.userName
                        ? `${ticketMeta.userName}${ticketMeta.userEmail ? ` • ${ticketMeta.userEmail}` : ""}`
                        : "Выберите тикет слева"
                      : "Напишите сообщение, и тикет создастся автоматически"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdminRoute && activeTicket?.status !== "closed" && activeTicketId && (
                    <Button variant="outline" size="sm" onClick={handleCloseTicket}>
                      Завершить тикет
                    </Button>
                  )}
                  {ticketLoading && <LoaderCircle className="size-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              {isAdminRoute && ticketMeta.teams.length > 0 && (
                <div className="border-b px-4 py-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Команды пользователя</div>
                  <div className="flex flex-wrap gap-2">
                    {ticketMeta.teams.map((team) => (
                      <div key={team.id} className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs">
                        <span className="flex size-4 items-center justify-center overflow-hidden rounded-full bg-background">
                          {team.img_url ? <img src={team.img_url} alt="" className="size-full object-cover" /> : <Users className="size-3" />}
                        </span>
                        <span>{team.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-[540px] overflow-y-auto px-4 py-4">
                <div className="flex min-h-full flex-col gap-3">
                  {ticketMessages.length > 0 ? (
                    ticketMessages.map((message) => <SupportBubble key={message.id} message={message} />)
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {isAdminRoute ? "Выберите тикет слева, чтобы увидеть переписку." : "Здесь появится чат поддержки после первого сообщения."}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={isAdminRoute ? "Ответ техподдержки..." : "Напишите сообщение в техподдержку..."}
                    rows={3}
                    className="min-h-[92px] resize-none rounded-2xl"
                  />
                  <Button onClick={() => void handleSend()} disabled={!draft.trim() || sending} className="h-11 shrink-0 gap-2">
                    {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Отправить
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Чисто Задачи
      </footer>
    </div>
  )
}
