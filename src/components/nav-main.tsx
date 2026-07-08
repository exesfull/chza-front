"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

import { useTeams } from "@/hooks/use-teams"
import { Skeleton } from "@/components/ui/skeleton"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    defaultOpen?: boolean
    adminOnly?: boolean
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    exact?: boolean
  }[]
  }[]
}) {
  const location = useLocation()
  const { teamLogin } = useParams()
  const { teamMembership } = useTeams()

  // Show skeleton while membership (admin status) is loading
  if (!teamMembership) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {Array.from({ length: 4 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <div className="flex h-8 items-center gap-2 px-2 animate-pulse">
                <Skeleton className="size-4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  const resolveUrl = (url: string) => {
    if (url === ".") return `/teams/${teamLogin}`
    if (url.startsWith("/")) return url
    return `/teams/${teamLogin}/${url}`
  }

  const isActivePath = (url: string) => {
    const resolved = resolveUrl(url)
    if (url === ".") return location.pathname === `/teams/${teamLogin}` || location.pathname === `/teams/${teamLogin}/`
    return location.pathname === resolved || location.pathname.startsWith(resolved + "/")
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.title === "separator" ? (
            <div key="separator" className="my-2 border-t border-sidebar-border" />
          ) : item.items && item.items.length > 0 ? (
          <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.defaultOpen ?? item.isActive ?? isActivePath(item.url)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.isActive ?? isActivePath(item.url)}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild isActive={subItem.exact ? location.pathname === resolveUrl(subItem.url) : isActivePath(subItem.url)}>
                        <Link to={resolveUrl(subItem.url)}>
                          {subItem.icon && <subItem.icon />}
                          <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                <Link to={resolveUrl(item.url)}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
