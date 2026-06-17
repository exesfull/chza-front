import axios from "axios"

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
      // Save current URL to localStorage
      const currentPath = window.location.pathname + window.location.search
      localStorage.setItem("auth_redirect_url", currentPath)
      // Redirect to login page
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

