const PUBLIC_PATHS = ["/", "/login", "/forbidden"]

export function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return "/"
  }

  return pathname.replace(/\/+$/, "")
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(normalizePathname(pathname))
}

export function getCurrentPath() {
  return window.location.pathname + window.location.search
}
