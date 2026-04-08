import { useEffect } from "react"
import { useTeams } from "@/hooks/use-teams"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

export function TeamDashboardPage() {
  const { teamMembership } = useTeams()
  const teamName = teamMembership?.team?.title || "Чисто Задачи"

  useEffect(() => {
    document.title = teamName
  }, [teamName])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="text-sm text-muted-foreground">
          Обзор активности и метрики команды
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Всего задач</CardDescription>
            <CardTitle>1,250</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Рост за месяц
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">За последний квартал</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Завершено</CardDescription>
            <CardTitle>834</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +8.2%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Высокая продуктивность
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Выше среднего показателя</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>В работе</CardDescription>
            <CardTitle>316</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDown className="size-3" />
                -5.1%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Снижение нагрузки
              <TrendingDown className="size-4" />
            </div>
            <div className="text-muted-foreground">Оптимальная загрузка</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Участники</CardDescription>
            <CardTitle>12</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                +2
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Новые участники
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Присоединились за месяц</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
