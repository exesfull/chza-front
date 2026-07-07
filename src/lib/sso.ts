const EID_CLIENT_ID = import.meta.env.VITE_EID_CLIENT_ID || "pq9m8ytrmdxpq983yxxq3R"
const EID_START_URL = import.meta.env.VITE_EID_START_URL || "https://id.exesfull.com/oauth/esm/sso"

export function generateSsoState(): string {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function setSsoStateCookie(state: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  const domain = window.location.hostname.includes("localhost") ? "" : `; Domain=${window.location.hostname}`
  document.cookie = `chza_sso_state=${encodeURIComponent(state)}; Path=/; Max-Age=600; SameSite=Lax${secure}${domain}`
}

export function clearSsoStateCookie(): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  const domain = window.location.hostname.includes("localhost") ? "" : `; Domain=${window.location.hostname}`
  document.cookie = `chza_sso_state=; Path=/; Max-Age=0; SameSite=Lax${secure}${domain}`
}

export function buildSsoStartUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: EID_CLIENT_ID,
    state,
  })

  return `${EID_START_URL}?${params.toString()}`
}

export function buildLocalLogoutUrl(): string {
  return "/api/esm/eid/logout/"
}

export function buildSwitchAccountUrl(): string {
  return "/api/esm/eid/switch-account/"
}
