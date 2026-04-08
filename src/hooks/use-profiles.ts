import { useState, useCallback, useRef } from "react"
import { api } from "@/lib/api"

export interface UserProfile {
  first_name: string
  last_name: string
  img_url: string
}

const profileCache = new Map<string, UserProfile>()

export function useProfiles() {
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map(profileCache))
  const fetchingRef = useRef(false)

  const fetchProfiles = useCallback(async (teamLogin: string, userIds: string[]) => {
    if (fetchingRef.current) return
    const unknownIds = userIds.filter((id) => !profileCache.has(id))
    if (unknownIds.length === 0) return

    fetchingRef.current = true
    try {
      const formData = new FormData()
      formData.append("team_login", teamLogin)
      formData.append("data", JSON.stringify(unknownIds))
      const { data } = await api.post("/main/team/getProfilesInfo/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (data.status && data.data) {
        Object.entries(data.data).forEach(([id, profile]: [string, any]) => {
          const p: UserProfile = {
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            img_url: profile.img_url || "",
          }
          profileCache.set(id, p)
        })
        setProfiles(new Map(profileCache))
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const getProfile = useCallback((userId: string): UserProfile | null => {
    return profileCache.get(userId) || null
  }, [])

  return { profiles, fetchProfiles, getProfile }
}
