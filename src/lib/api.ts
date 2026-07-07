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

