import { Users, Settings, HelpCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const footerItems = [
  {
    title: "Мои команды",
    url: "/teams",
    icon: Users,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Помощь",
    url: "/help",
    icon: HelpCircle,
  },
]

export function NavFooter() {
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {footerItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === item.url}
              className="w-full"
            >
              <Link to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
