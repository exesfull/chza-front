import axios from "axios"
import { getCurrentPath, isPublicPath } from "@/lib/auth-redirect"

// During development, use relative URL (proxied by Vite)
// During production, use the full URL
const isDev = import.meta.env.DEV

export const api = axios.create({
  baseURL: isDev ? "/api/v1" : "https://chza.exesfull.com/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const pathname = window.location.pathname

      if (!isPublicPath(pathname)) {
        localStorage.setItem("auth_redirect_url", getCurrentPath())
        window.location.replace("/login")
      }
    }
    return Promise.reject(error)
  }
)
