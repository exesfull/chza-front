import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, LoaderCircle, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useTeams } from "@/hooks/use-teams"

interface Preview { team: { login: string; name: string; description: string | null; img_url: string }; already_member: boolean }

export function TeamInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { refreshTeams } = useTeams()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.get(`/main/team/invitePreview/?token=${encodeURIComponent(token || "")}`).then(({ data }) => {
      if (data.data.already_member) navigate(`/teams/${data.data.team.login}`, { replace: true })
      else setPreview(data.data)
    }).catch(() => setError("Ссылка недействительна, отключена или ее лимит исчерпан")).finally(() => setLoading(false))
  }, [navigate, token])

  const join = async () => {
    setJoining(true)
    try {
      const body = new URLSearchParams(); body.set("token", token || "")
      const { data } = await api.post("/main/team/joinByInvite/", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      await refreshTeams()
      navigate(`/teams/${data.data.team.login}`, { replace: true })
    } catch { setError("Не удалось присоединиться к команде"); setJoining(false) }
  }

  return <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top_left,_hsl(var(--muted)),_transparent_45%)] p-4">
    <Card className="w-full max-w-md"><CardContent className="flex flex-col items-center p-8 text-center">
      {loading ? <LoaderCircle className="size-9 animate-spin" /> : error ? <><Users className="mb-4 size-10 text-muted-foreground" /><h1 className="text-xl font-semibold">Приглашение недоступно</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" variant="outline" onClick={() => navigate("/teams")}><ArrowLeft className="mr-2 size-4" />Назад к командам</Button></> : preview && <>
        <Avatar className="mb-5 size-24"><AvatarImage src={preview.team.img_url} /><AvatarFallback className="text-2xl">{preview.team.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        <p className="text-sm text-muted-foreground">Вас приглашают в команду</p><h1 className="mt-1 text-2xl font-bold">{preview.team.name}</h1>{preview.team.description && <p className="mt-3 text-sm text-muted-foreground">{preview.team.description}</p>}
        <div className="mt-7 flex w-full gap-2"><Button className="flex-1" variant="outline" onClick={() => navigate("/teams")}>Назад</Button><Button className="flex-1" disabled={joining} onClick={join}>{joining && <LoaderCircle className="mr-2 size-4 animate-spin" />}Присоединиться</Button></div>
      </>}
    </CardContent></Card>
  </main>
}
