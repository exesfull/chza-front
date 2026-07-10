import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CheckSquare, Copy, Database, FolderKanban, Link2, ListTodo, MoreVertical, Plus, RotateCcw, Save, Shield, SquareStack, Trash2, Users } from "lucide-react"
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
  const { data, loading, error, updateSettings, createInvite, disableInvite, setMemberAdmin, removeMember } = useTeamAdmin(teamLogin)
  const [section, setSection] = useState<Section>("general")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
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
      <div>
        <p className="text-sm text-muted-foreground">Настройки команды</p>
        <h1 className="text-2xl font-bold">Управление командой</h1>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => <Button key={tab.id} variant="ghost" onClick={() => setSection(tab.id)} className={cn("gap-2", section === tab.id && "bg-muted")}><tab.icon className="size-4" />{tab.label}</Button>)}
      </div>
      {message && <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">{message}</div>}

      {section === "general" && <><Card>
        <CardHeader><CardTitle>Информация о команде</CardTitle><CardDescription>Эти данные видят все участники команды.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-20"><AvatarImage src={image} /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Выбрать изображение<input className="hidden" type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} /></label><Button type="button" variant="outline" onClick={() => setImage(buildTeamAvatarUrl(name))}><RotateCcw className="mr-2 size-4" />Сбросить</Button></div><p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG, до 1 МБ</p></div>
          </div>
          <div className="max-w-xl space-y-2"><label className="text-sm font-medium">Название</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          <div className="max-w-2xl space-y-2"><label className="text-sm font-medium">Описание</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></div>
          <Button onClick={saveTeam} disabled={busy || !name.trim()}><Save className="mr-2 size-4" />Сохранить</Button>
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
        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Ссылки приглашения</CardTitle><CardDescription>Создавайте отдельные ссылки и задавайте лимит вступлений.</CardDescription></div><Button onClick={() => setInviteOpen(true)}><Plus className="mr-2 size-4" />Создать ссылку</Button></CardHeader>
          <CardContent className="space-y-3">{data.invites.length === 0 ? <p className="text-sm text-muted-foreground">Ссылок пока нет.</p> : data.invites.map((invite) => {
            const url = `${window.location.origin}/invite/${invite.token}`
            return <div key={invite.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Link2 className="size-4" /><span className="font-medium">{invite.name}</span><Badge variant={invite.is_active ? "secondary" : "outline"}>{invite.is_active ? "Активна" : "Отключена"}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{url}</p><p className="mt-1 text-xs text-muted-foreground">Вступило: {invite.uses_count}{invite.max_uses === null ? " · без лимита" : ` из ${invite.max_uses}`}</p></div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(url)}><Copy className="mr-2 size-4" />Копировать</Button>
              {invite.is_active && <Button variant="ghost" size="sm" onClick={() => run(() => disableInvite(invite.id), "Ссылка отключена")}><Trash2 className="mr-2 size-4" />Отключить</Button>}
            </div>
          })}</CardContent>
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Новая ссылка приглашения</DialogTitle><DialogDescription>Лимит учитывается только при добавлении нового участника.</DialogDescription></DialogHeader><div className="space-y-4"><div className="max-w-md space-y-2"><label className="text-sm font-medium">Название ссылки</label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Например, отдел разработки" /></div><div className="max-w-48 space-y-2"><label className="text-sm font-medium">Лимит вступлений</label><Input type="number" min="1" value={inviteLimit} onChange={(e) => setInviteLimit(e.target.value)} placeholder="Без ограничений" /></div></div><DialogFooter><Button variant="outline" onClick={() => setInviteOpen(false)}>Отмена</Button><Button disabled={!inviteName.trim() || busy} onClick={() => run(async () => { await createInvite({ name: inviteName, max_uses: inviteLimit ? Number(inviteLimit) : undefined }); setInviteOpen(false); setInviteName(""); setInviteLimit("") }, "Ссылка создана")}>Создать</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(confirmMember)} onOpenChange={(open) => !open && setConfirmMember(null)}><DialogContent><DialogHeader><DialogTitle>Исключить участника?</DialogTitle><DialogDescription>Пользователь потеряет доступ к команде и ее проектам.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmMember(null)}>Отмена</Button><Button variant="destructive" onClick={() => confirmMember && run(async () => { await removeMember(confirmMember.id); setConfirmMember(null) }, "Участник исключен")}>Исключить</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
