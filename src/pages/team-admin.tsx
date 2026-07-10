import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CheckSquare, Copy, Database, FolderKanban, Link2, ListTodo, MoreVertical, Plus, QrCode, RotateCcw, Save, Shield, SquareStack, Trash2, Users, Link as LinkIcon, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTeamAdmin, type AdminMember } from "@/hooks/use-team-admin"
import { useTeams } from "@/hooks/use-teams"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"

type Section = "general" | "members" | "usage"

function buildTeamAvatarUrl(teamName: string) {
  const cleanName = teamName.trim().replace(/\s+/g, " ") || "team"
  const length = Math.min(4, Math.max(1, Array.from(cleanName).length))
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random&length=${length}&size=256&font-size=0.33`
}

export function TeamAdminPage() {
  const { teamLogin } = useParams()
  const navigate = useNavigate()
  const { isAdmin, refreshTeams, checkTeamMembership } = useTeams()
  const { user } = useUser()
  const { data, loading, error, updateSettings, createInvite, disableInvite, deleteInvite, setMemberAdmin, removeMember } = useTeamAdmin(teamLogin)
  const [section, setSection] = useState<Section>("general")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [usedInvitesOpen, setUsedInvitesOpen] = useState(false)
  const [qrInvite, setQrInvite] = useState<string | null>(null)
  const [inviteName, setInviteName] = useState("")
  const [inviteLimit, setInviteLimit] = useState("")
  const [confirmMember, setConfirmMember] = useState<AdminMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (data?.team) {
      setName(data.team.name)
      setDescription(data.team.description || "")
      setImage(data.team.img_url || "")
    }
  }, [data?.team])

  useEffect(() => {
    if (!loading && !isAdmin) navigate(`/teams/${teamLogin}`, { replace: true })
  }, [isAdmin, loading, navigate, teamLogin])

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setMessage("")
    try { await action(); setMessage(success) } catch { setMessage("Не удалось выполнить действие") } finally { setBusy(false) }
  }

  const saveTeam = () => run(async () => {
    await updateSettings({ name, description, img_url: image })
    await refreshTeams()
    if (teamLogin) await checkTeamMembership(teamLogin)
  }, "Настройки команды сохранены")

  const resetTeamImage = () => {
    const nextImage = buildTeamAvatarUrl(name)
    setImage(nextImage)
    void run(async () => {
      await updateSettings({ name, description, img_url: nextImage })
      await refreshTeams()
      if (teamLogin) await checkTeamMembership(teamLogin)
    }, "Фото команды сброшено")
  }

  const handleImage = (file?: File) => {
    if (!file) return
    if (file.size > 1024 * 1024) { setMessage("Изображение должно быть не больше 1 МБ"); return }
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result || ""))
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Загрузка управления командой...</div>
  if (error || !data) return <div className="p-6 text-sm text-destructive">{error || "Раздел недоступен"}</div>

  const tabs = [
    { id: "general" as const, label: "Команда", icon: Shield },
    { id: "members" as const, label: "Участники и приглашения", icon: Users },
    { id: "usage" as const, label: "Расходы", icon: Database },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => <Button key={tab.id} variant="ghost" onClick={() => setSection(tab.id)} className={cn("gap-2", section === tab.id && "bg-muted")}><tab.icon className="size-4" />{tab.label}</Button>)}
      </div>
      {message && <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">{message}</div>}

      {section === "general" && <><Card>
        <CardHeader className="space-y-1">
          <CardTitle>Информация о команде</CardTitle>
          <CardDescription>Эти данные видят все участники команды.</CardDescription>
          <div className="flex justify-end">
            <Button onClick={saveTeam} disabled={busy || !name.trim()} className="gap-2">
              <Save className="size-4" />
              Сохранить изменения
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-20"><AvatarImage src={image} /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Выбрать изображение
                  <input className="hidden" type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
                </label>
                <Button type="button" variant="outline" onClick={resetTeamImage}>
                  <RotateCcw className="mr-2 size-4" />
                  Сбросить
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG, до 1 МБ</p>
            </div>
          </div>
          <div className="max-w-xl space-y-2"><label className="text-sm font-medium">Название</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          <div className="max-w-2xl space-y-2"><label className="text-sm font-medium">Описание</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Статистика команды</CardTitle><CardDescription>Количество активных объектов во всех разделах команды.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Проекты", value: data.stats.projects, icon: FolderKanban },
          { label: "Ссылки", value: data.stats.links, icon: Link2 },
          { label: "Списки задач", value: data.stats.task_lists, icon: ListTodo },
          { label: "Задачи", value: data.stats.tasks, icon: CheckSquare },
          { label: "Доски", value: data.stats.boards, icon: SquareStack },
        ].map((item) => <div key={item.label} className="rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><item.icon className="size-4" />{item.label}</div><p className="mt-3 text-3xl font-semibold tabular-nums">{item.value}</p></div>)}
      </div></CardContent></Card></>}

      {section === "members" && <>
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Ссылки приглашения</CardTitle>
              <CardDescription>Создавайте отдельные ссылки с названием и лимитом переходов.</CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setUsedInvitesOpen(true)} className="shrink-0">
                Использованные
              </Button>
              <Button onClick={() => setInviteOpen(true)} className="shrink-0">
                <Plus className="mr-2 size-4" />
                Создать ссылку
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Пока нет ни одной ссылки приглашения. Создайте первую, чтобы делиться доступом к команде.
              </div>
            ) : (
              data.invites.map((invite) => {
                const url = `${window.location.origin}/invite/${invite.token}`
                return (
                  <div key={invite.id} className="rounded-2xl border bg-background/60 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex size-9 items-center justify-center rounded-full bg-muted">
                            <LinkIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{invite.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {invite.is_active ? "Активна" : "Отключена"} · {invite.uses_count} использований{invite.max_uses === null ? "" : ` из ${invite.max_uses}`}
                            </div>
                          </div>
                          <Badge variant={invite.is_active ? "secondary" : "outline"}>{invite.is_active ? "Доступна" : "Выключена"}</Badge>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          <span className="truncate text-muted-foreground">{url}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(url)}>
                          <Copy className="mr-2 size-4" />
                          Копировать
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQrInvite(url)}>
                          <QrCode className="mr-2 size-4" />
                          QR-code
                        </Button>
                        {invite.is_active && (
                          <Button variant="ghost" size="sm" onClick={() => run(() => disableInvite(invite.id), "Ссылка отключена")}>
                            <Trash2 className="mr-2 size-4" />
                            Отключить
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => {
                          if (window.confirm(`Удалить ссылку "${invite.name}"?`)) {
                            void run(() => deleteInvite(invite.id), "Ссылка удалена")
                          }
                        }}>
                          <Trash2 className="mr-2 size-4" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Участники ({data.members.length})</CardTitle></CardHeader><CardContent className="space-y-2">{data.members.map((member) => {
          const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email
          const isSelf = member.id === user?.id
          return <div key={member.id} className="flex items-center gap-3 rounded-xl border p-3">
            <Avatar><AvatarImage src={member.img_url} /><AvatarFallback>{fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{fullName}</span>{member.is_owner && <Badge>Владелец</Badge>}{member.is_admin && !member.is_owner && <Badge variant="secondary">Администратор</Badge>}</div><p className="truncate text-sm text-muted-foreground">{member.email}</p></div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={member.is_owner || isSelf}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => run(() => setMemberAdmin(member.id, !member.is_admin), member.is_admin ? "Права администратора сняты" : "Права администратора выданы")}><Shield className="mr-2 size-4" />{member.is_admin ? "Разжаловать" : "Сделать администратором"}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmMember(member)}><Trash2 className="mr-2 size-4" />Исключить из команды</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>
          </div>
        })}</CardContent></Card>
      </>}

      {section === "usage" && <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Токены AI</CardTitle><CardDescription>Расходы команды на запросы агента</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">—</p><p className="text-sm text-muted-foreground">Статистика появится позже</p></CardContent></Card><Card><CardHeader><CardTitle>Хранилище</CardTitle><CardDescription>Файлы и данные команды</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">— ГБ</p><p className="text-sm text-muted-foreground">Статистика появится позже</p></CardContent></Card></div>}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая ссылка приглашения</DialogTitle>
            <DialogDescription>Создайте отдельную ссылку, задайте ей имя и ограничение по вступлениям.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название ссылки</label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Например, отдел разработки" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Лимит вступлений</label>
              <Input type="number" min="1" value={inviteLimit} onChange={(e) => setInviteLimit(e.target.value)} placeholder="Без ограничений" />
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
              Лимит считается только для новых присоединений. Если участник уже есть в команде, ссылка откроет главную страницу.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Отмена</Button>
            <Button
              disabled={!inviteName.trim() || busy}
              onClick={() => run(async () => {
                await createInvite({ name: inviteName, max_uses: inviteLimit ? Number(inviteLimit) : undefined })
                setInviteOpen(false)
                setInviteName("")
                setInviteLimit("")
              }, "Ссылка создана")}
            >
              <Sparkles className="mr-2 size-4" />
              Создать ссылку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={usedInvitesOpen} onOpenChange={setUsedInvitesOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Использованные ссылки</DialogTitle>
            <DialogDescription>Показаны отключенные, истекшие и уже исчерпавшие лимит ссылки. До 100 штук.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {(data.used_invites || []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Использованных ссылок пока нет.
              </div>
            ) : (
              data.used_invites.map((invite) => {
                const url = `${window.location.origin}/invite/${invite.token}`
                return (
                  <div key={invite.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{invite.name}</span>
                          <Badge variant="outline">Использована</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{url}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Вступлений: {invite.uses_count}{invite.max_uses === null ? "" : ` / ${invite.max_uses}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(url)}>
                          <Copy className="mr-2 size-4" />
                          Копировать
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQrInvite(url)}>
                          <QrCode className="mr-2 size-4" />
                          QR-code
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                          if (window.confirm(`Удалить ссылку "${invite.name}"?`)) {
                            void run(() => deleteInvite(invite.id), "Ссылка удалена")
                          }
                        }}>
                          <Trash2 className="mr-2 size-4" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(qrInvite)} onOpenChange={(open) => !open && setQrInvite(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR-code</DialogTitle>
            <DialogDescription>Отсканируйте код, чтобы открыть ссылку приглашения.</DialogDescription>
          </DialogHeader>
          {qrInvite && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrInvite)}`}
                  alt="QR-code приглашения"
                  className="size-64"
                />
              </div>
              <div className="w-full rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground break-all">
                {qrInvite}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(confirmMember)} onOpenChange={(open) => !open && setConfirmMember(null)}><DialogContent><DialogHeader><DialogTitle>Исключить участника?</DialogTitle><DialogDescription>Пользователь потеряет доступ к команде и ее проектам.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmMember(null)}>Отмена</Button><Button variant="destructive" onClick={() => confirmMember && run(async () => { await removeMember(confirmMember.id); setConfirmMember(null) }, "Участник исключен")}>Исключить</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
