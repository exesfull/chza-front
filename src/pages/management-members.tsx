import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Copy,
  RefreshCw,
  MoreVertical,
  Shield,
  UserMinus,
  Check,
  X,
} from "lucide-react"

interface Member {
  id: number
  name: string
  email: string
  avatar: string
  role: "admin" | "member"
}

const initialMembers: Member[] = [
  { id: 1, name: "shadcn", email: "m@example.com", avatar: "/avatars/shadcn.jpg", role: "admin" },
  { id: 2, name: "John Doe", email: "john@example.com", avatar: "", role: "member" },
  { id: 3, name: "Jane Smith", email: "jane@example.com", avatar: "", role: "member" },
]

export function ManagementMembersPage() {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [inviteLink] = useState("https://app.example.com/invite/abc123")
  const [copied, setCopied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"promote" | "remove">("promote")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = () => {
    // Generate new invite link
  }

  const openDialog = (member: Member, type: "promote" | "remove") => {
    setSelectedMember(member)
    setDialogType(type)
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedMember) return

    if (dialogType === "promote") {
      setMembers(
        members.map((m) =>
          m.id === selectedMember.id
            ? { ...m, role: m.role === "admin" ? "member" : "admin" }
            : m
        )
      )
    } else {
      setMembers(members.filter((m) => m.id !== selectedMember.id))
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Список участников</h1>
          <p className="text-sm text-muted-foreground">Управление участниками команды</p>
        </div>
      </div>

      {/* Invite Link */}
      <Card>
        <CardHeader>
          <CardTitle>Приглашение</CardTitle>
          <CardDescription>Поделитесь ссылкой для приглашения новых участников</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="flex-1" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Участники ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-sm text-muted-foreground">{member.email}</span>
                  </div>
                  {member.role === "admin" && (
                    <Badge variant="secondary" className="ml-2">
                      Администратор
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDialog(member, "promote")}>
                      <Shield className="mr-2 size-4" />
                      {member.role === "admin" ? "Снять администратора" : "Дать доступ администратора"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDialog(member, "remove")}
                    >
                      <UserMinus className="mr-2 size-4" />
                      Удалить из команды
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "promote"
                ? selectedMember?.role === "admin"
                  ? "Снять доступ администратора?"
                  : "Дать доступ администратора?"
                : "Удалить участника?"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "promote"
                ? selectedMember?.role === "admin"
                  ? `Вы уверены, что хотите снять администраторские права у ${selectedMember?.name}?`
                  : `Вы уверены, что хотите дать администраторские права ${selectedMember?.name}?`
                : `Вы уверены, что хотите удалить ${selectedMember?.name} из команды? Это действие нельзя отменить.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant={dialogType === "remove" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {dialogType === "promote" ? "Подтвердить" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
