import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload } from "lucide-react"

export function ManagementGeneralPage() {
  const [teamName, setTeamName] = useState("Acme Inc")
  const [description, setDescription] = useState("Enterprise team focused on innovative solutions")

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Основное</h1>
        <p className="text-sm text-muted-foreground">Управление основной информацией о команде</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о команде</CardTitle>
          <CardDescription>Название, описание и иконка команды</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Icon Upload */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarImage src="/avatars/shadcn.jpg" />
                <AvatarFallback className="text-2xl">AI</AvatarFallback>
              </Avatar>
              <label
                htmlFor="icon-upload"
                className="absolute -bottom-1 -right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Camera className="size-4" />
              </label>
              <input id="icon-upload" type="file" accept="image/*" className="hidden" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Иконка команды</span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG или SVG. Максимум 1MB
              </span>
              <Button variant="outline" size="sm" className="mt-1 w-fit">
                <Upload className="mr-2 size-4" />
                Загрузить
              </Button>
            </div>
          </div>

          {/* Team Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Название команды</label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Введите название"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Описание</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание команды..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Отмена</Button>
            <Button>Сохранить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
