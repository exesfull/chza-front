import { ArrowLeftRight, ChevronsUpDown, LogOut, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/hooks/use-user"
import { buildLocalLogoutUrl, buildSwitchAccountUrl } from "@/lib/sso"

export function UserMenu() {
  const { user } = useUser()

  const displayName = user ? `${user.last_name} ${user.first_name}` : "Пользователь"
  const displayEmail = user?.email || ""
  const displayAvatar = user?.img_url || ""
  const initials = user
    ? `${user.last_name?.[0] ?? ""}${user.first_name?.[0] ?? ""}`.toUpperCase()
    : "П"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/50"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={displayAvatar} alt={displayName} />
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-col text-left sm:flex">
            <span className="max-w-[180px] truncate text-sm font-medium">{displayName}</span>
            <span className="max-w-[180px] truncate text-xs text-muted-foreground">{displayEmail}</span>
          </div>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56 rounded-lg">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = "https://id.exesfull.com/oauth/my/"}>
          <User />
          Профиль
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.href = buildSwitchAccountUrl()}>
          <ArrowLeftRight />
          Сменить аккаунт
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = buildLocalLogoutUrl()}>
          <LogOut />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
