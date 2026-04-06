"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface AvatarWithLoaderProps {
  src?: string
  alt?: string
  fallback: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function AvatarWithLoader({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarWithLoaderProps) {
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  }

  const handleLoad = () => {
    setLoaded(true)
  }

  const handleError = () => {
    setError(true)
    setLoaded(true)
  }

  if (!src || error) {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
      )}
      <Avatar className={cn("h-full w-full", loaded ? "opacity-100" : "opacity-0")}>
        <AvatarImage
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
        />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  )
}
