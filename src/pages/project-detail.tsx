import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowUpAZ,
  ArrowUpZA,
  Calendar,
  CalendarArrowDown,
  CalendarArrowUp,
  Box,
  ChevronRight,
  FolderPlus,
  Link2,
  ListTodo,
  Plus,
  Search,
  Settings,
  Trash2,
  SquareStack,
  MoveRight,
  Pencil,
  MoreVertical,
  UploadCloud,
  FileUp,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  FileCode2,
  Presentation,
  FileSpreadsheet,
  Download,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useProjects, type ProjectDetail } from "@/hooks/use-projects"
import { useBoards } from "@/hooks/use-boards"
import { useTeams } from "@/hooks/use-teams"

type BoardSort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc"
type ProjectCreateType = "folder" | "task_list" | "link" | "board" | "calendar" | "file"

interface ProjectGridItem {
  id: string
  project_item_id?: string
  type: ProjectCreateType
  title: string
  description: string | null
  url?: string
  parent_id: string | null
  updated_at: string | null
  children: ProjectGridItem[]
  depth?: number
  size_bytes?: number
  mime_type?: string | null
  file_kind?: string | null
  download_url?: string | null
  preview_url?: string | null
  public_url?: string | null
  original_name?: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Только что"
  const date = new Date(dateStr.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return "Только что"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}

function formatFileSize(bytes: number | null | undefined): string {
  const value = Number(bytes || 0)
  if (value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const size = value / Math.pow(1024, index)
  const formatted = size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)
  return `${formatted} ${units[index]}`
}

function detectLocalFileKind(name: string, mimeType?: string | null): ProjectGridItem["file_kind"] {
  const lower = name.toLowerCase()
  const ext = lower.split(".").pop() || ""
  if (mimeType?.startsWith("image/")) return "image"
  if (mimeType?.startsWith("video/")) return "video"
  if (mimeType?.startsWith("text/")) return "text"
  if (mimeType === "application/pdf") return "pdf"
  if (["zip", "rar", "7z", "tar", "gz", "tgz"].includes(ext)) return "archive"
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "document"
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "spreadsheet"
  if (["ppt", "pptx", "odp"].includes(ext)) return "presentation"
  if (["php", "js", "ts", "tsx", "jsx", "py", "go", "java", "c", "cpp", "h", "cs", "json", "yml", "yaml", "xml", "html", "css", "scss", "sh", "sql"].includes(ext)) return "code"
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic"].includes(ext)) return "image"
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v"].includes(ext)) return "video"
  if (["txt", "md", "log"].includes(ext)) return "text"
  if (ext === "pdf") return "pdf"
  return "file"
}

function getFileKindLabel(kind?: ProjectGridItem["file_kind"] | null): string {
  switch (kind) {
    case "image":
      return "Изображение"
    case "video":
      return "Видео"
    case "text":
      return "Текст"
    case "archive":
      return "Архив"
    case "document":
      return "Документ"
    case "pdf":
      return "PDF"
    case "spreadsheet":
      return "Таблица"
    case "presentation":
      return "Презентация"
    case "code":
      return "Код"
    default:
      return "Файл"
  }
}

function getProjectItemIcon(type: ProjectCreateType, fileKind?: ProjectGridItem["file_kind"]) {
  if (type === "folder") return FolderPlus
  if (type === "task_list") return ListTodo
  if (type === "link") return Link2
  if (type === "calendar") return Calendar
  if (type === "file") {
    if (fileKind === "image") return FileImage
    if (fileKind === "video") return FileVideo
    if (fileKind === "text" || fileKind === "pdf" || fileKind === "document") return FileText
    if (fileKind === "archive") return FileArchive
    if (fileKind === "spreadsheet") return FileSpreadsheet
    if (fileKind === "presentation") return Presentation
    if (fileKind === "code") return FileCode2
    return FileUp
  }
  return Box
}

function findProjectPath(items: NonNullable<ProjectDetail["items"]> | undefined, targetId: string): string[] {
  if (!items || items.length === 0) return []

  const walk = (nodes: NonNullable<ProjectDetail["items"]>, trail: string[]): string[] | null => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.name]
      if (node.id === targetId) {
        return nextTrail
      }
      const found = walk(node.children || [], nextTrail)
      if (found) return found
    }
    return null
  }

  return walk(items, []) || []
}

function flattenProjectItems(items: ProjectGridItem[], depth = 0): ProjectGridItem[] {
  const output: ProjectGridItem[] = []
  const walk = (entry: ProjectGridItem, currentDepth: number) => {
    output.push({ ...entry, depth: currentDepth })
    entry.children.forEach((child) => walk(child, currentDepth + 1))
  }
  items.forEach((item) => walk(item, depth))
  return output
}

function mapApiProjectItems(items: NonNullable<ProjectDetail["items"]>): ProjectGridItem[] {
  return items.map((item) => ({
    id: item.object_id || item.id,
    project_item_id: item.id,
    type: item.object_type as ProjectCreateType,
    title: item.name,
    description: item.description,
    url: undefined,
    parent_id: item.parent_id,
    updated_at: item.updated_at,
    size_bytes: item.size_bytes,
    mime_type: item.mime_type,
    file_kind: item.file_kind,
    download_url: item.download_url,
    preview_url: item.preview_url,
    public_url: item.public_url,
    original_name: item.original_name,
    children: mapApiProjectItems(item.children || []),
  }))
}

export function ProjectPage() {
  const { teamLogin, projectId } = useParams()
  const navigate = useNavigate()
  const { activeTeam, storageUsage, refreshTeams, fetchStorageUsage } = useTeams()
  const { getProject, createFolder, renameItem, moveItem, deleteItem } = useProjects(teamLogin, { autoLoad: false })
  const { createBoard } = useBoards(teamLogin)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardSearch, setBoardSearch] = useState("")
  const [boardSort, setBoardSort] = useState<BoardSort>("updated_desc")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<"choose" | "form">("choose")
  const [createType, setCreateType] = useState<ProjectCreateType | null>(null)
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkComment, setLinkComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId?: string | null; parentId?: string | null } | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameItemId, setRenameItemId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Array<{ id: string; file: File; displayName: string; size: number; kind: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [dragActive, setDragActive] = useState(false)
  const [previewItem, setPreviewItem] = useState<ProjectGridItem | null>(null)
  const [previewImageUseProxy, setPreviewImageUseProxy] = useState(false)
  const [fileImageFallbacks, setFileImageFallbacks] = useState<Record<string, boolean>>({})

  const storageOverview = storageUsage || (activeTeam ? {
    used_bytes: activeTeam.storage_used_bytes ?? Math.round((activeTeam.storage_used_gb ?? 0) * 1000000000),
    limit_bytes: activeTeam.storage_limit_bytes ?? Math.round((activeTeam.storage_limit_gb ?? 1) * 1000000000),
    percent: activeTeam.storage_percent ?? 0,
  } : null)
  const availableBytes = Math.max(0, (storageOverview?.limit_bytes ?? Math.round(1 * 1000000000)) - (storageOverview?.used_bytes ?? 0))
  const selectedUploadBytes = selectedFiles.reduce((sum, item) => sum + item.size, 0)
  const canUploadSelected = selectedUploadBytes <= availableBytes
  const canOpenUploadEntry = availableBytes > 0

  const refreshProject = async () => {
    if (!projectId) return
    const data = await getProject(projectId)
    setProject(data)
  }

  useEffect(() => {
    let cancelled = false

    const loadProject = async () => {
      if (!projectId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const data = await getProject(projectId)
      if (!cancelled) {
        setProject(data)
        setLoading(false)
      }
    }

    loadProject()
    return () => {
      cancelled = true
    }
  }, [projectId, getProject])

  useEffect(() => {
    document.title = project?.name ? `Проект: ${project.name}` : "Проект"
  }, [project])

  useEffect(() => {
    setFileImageFallbacks({})
  }, [projectId])

  useEffect(() => {
    setPreviewImageUseProxy(false)
  }, [previewItem?.id])

  const closeUploadDialog = () => {
    if (uploading) return
    setUploadOpen(false)
    setUploadTargetFolderId(null)
    setSelectedFiles([])
    setUploadMessage("")
    setUploadProgress({})
  }

  const openUploadPicker = (parentId?: string | null) => {
    setUploadTargetFolderId(parentId ?? currentFolderId ?? null)
    fileInputRef.current?.click()
  }

  const handlePickedFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const mapped = files.map((file) => {
      const displayName = file.name
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        displayName,
        size: file.size,
        kind: detectLocalFileKind(file.name, file.type) || "file",
      }
    })

    setSelectedFiles(mapped)
    setUploadMessage("")
    setUploadProgress({})
    setUploadOpen(true)
  }

  const uploadFiles = async () => {
    if (!teamLogin || !projectId || uploading || selectedFiles.length === 0) return
    setUploading(true)
    setUploadMessage("")

    try {
      const limitBytes = Math.max(0, storageOverview?.limit_bytes ?? Math.round(1 * 1000000000))
      const usedBytes = Math.max(0, storageOverview?.used_bytes ?? 0)
      const available = Math.max(0, limitBytes - usedBytes)
      const totalSelected = selectedFiles.reduce((sum, item) => sum + item.size, 0)
      if (totalSelected > available) {
        setUploadMessage("В команде недостаточно места на диске")
        return
      }

      const chunkSize = 2 * 1024 * 1024

      for (const item of selectedFiles) {
        const initForm = new URLSearchParams()
        initForm.append("project_id", projectId)
        initForm.append("name", item.displayName)
        initForm.append("original_name", item.file.name)
        initForm.append("size_bytes", String(item.size))
        initForm.append("mime_type", item.file.type || "")
        if (uploadTargetFolderId) initForm.append("parent_id", uploadTargetFolderId)

        const initResponse = await api.post(
          `/main/project/uploadFileInit/?team_login=${teamLogin}`,
          initForm,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )

        if (!initResponse.data?.status || !initResponse.data?.data?.upload_id) {
          throw new Error(initResponse.data?.error || "upload_init_failed")
        }

        const uploadId = initResponse.data.data.upload_id as string
        const totalChunks = Math.max(1, Math.ceil(item.size / chunkSize))

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * chunkSize
          const end = Math.min(item.size, start + chunkSize)
          const chunk = item.file.slice(start, end)
          let uploaded = false
          let lastError: unknown = null
          for (let attempt = 0; attempt < 3 && !uploaded; attempt += 1) {
            try {
              const form = new FormData()
              form.append("project_id", projectId)
              form.append("upload_id", uploadId)
              form.append("name", item.displayName)
              form.append("original_name", item.file.name)
              form.append("size_bytes", String(item.size))
              form.append("mime_type", item.file.type || "")
              form.append("chunk_index", String(chunkIndex))
              form.append("total_chunks", String(totalChunks))
              if (uploadTargetFolderId) form.append("parent_id", uploadTargetFolderId)
              form.append("chunk", chunk, item.file.name)

              const response = await api.post(`/main/project/uploadFileChunk/?team_login=${teamLogin}`, form, {
                headers: { "Content-Type": "multipart/form-data" },
              })
              if (!response.data?.status) {
                throw new Error(response.data?.error || "upload_chunk_failed")
              }
              uploaded = true
              const progress = Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100))
              setUploadProgress((prev) => ({ ...prev, [item.id]: progress }))
              if (response.data?.data?.file) {
                await refreshProject()
              }
            } catch (error) {
              lastError = error
            }
          }

          if (!uploaded) {
            throw lastError instanceof Error ? lastError : new Error("upload_chunk_failed")
          }
        }

        setUploadProgress((prev) => ({ ...prev, [item.id]: 100 }))
      }

      await refreshProject()
      if (teamLogin) {
        await Promise.all([refreshTeams(), fetchStorageUsage(teamLogin)])
      }
      closeUploadDialog()
    } catch (error) {
      console.error("Failed to upload files:", error)
      setUploadMessage("Не удалось загрузить файлы")
    } finally {
      setUploading(false)
    }
  }

  const projectItems = useMemo(() => {
    const itemsFromApi = project?.items ? mapApiProjectItems(project.items) : []
    const fallbackItems: ProjectGridItem[] = [
      ...(project?.task_lists || []).map((item) => ({
        id: item.id,
        type: "task_list" as const,
        title: item.name,
        description: item.description,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
      ...(project?.links || []).map((item) => ({
        id: item.id,
        type: "link" as const,
        title: item.title,
        description: item.comment,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
      ...(project?.boards || []).map((item) => ({
        id: item.id,
        type: "board" as const,
        title: item.name,
        description: item.description,
        parent_id: null,
        updated_at: item.updated_at,
        children: [],
      })),
    ]

    const source = flattenProjectItems([
      ...itemsFromApi,
      ...fallbackItems.filter((fallbackItem) => !itemsFromApi.some((item) => item.type === fallbackItem.type && item.id === fallbackItem.id)),
    ])
    const filtered = source.filter((item) => {
      const haystack = `${item.title} ${item.description || ""}`.toLowerCase()
      return haystack.includes(boardSearch.toLowerCase())
    })

    return filtered.sort((a, b) => {
      switch (boardSort) {
        case "name_asc":
          return a.title.localeCompare(b.title, "ru")
        case "name_desc":
          return b.title.localeCompare(a.title, "ru")
        case "updated_asc":
          return new Date((a.updated_at || "").replace(" ", "T")).getTime() - new Date((b.updated_at || "").replace(" ", "T")).getTime()
        default:
          return new Date((b.updated_at || "").replace(" ", "T")).getTime() - new Date((a.updated_at || "").replace(" ", "T")).getTime()
      }
    })
  }, [project?.items, project?.task_lists, project?.links, project?.boards, boardSearch, boardSort])

  const folderItems = useMemo(() => projectItems.filter((item) => item.type === "folder"), [projectItems])
  const currentItem = contextMenu?.itemId ? projectItems.find((item) => item.id === contextMenu.itemId) || null : null
  const currentFolder = currentFolderId ? projectItems.find((item) => item.id === currentFolderId) || null : null
  const currentFolderPath = useMemo(() => findProjectPath(project?.items, currentFolderId || ""), [project?.items, currentFolderId])
  const visibleItems = useMemo(() => {
    const source = boardSearch.trim()
      ? projectItems
      : currentFolderId
        ? projectItems.filter((item) => item.parent_id === currentFolderId)
        : projectItems
    return source.filter((item) => {
      const typeLabel = item.type === "folder" ? "Папка" : item.type === "task_list" ? "Список задач" : item.type === "link" ? "Ссылка" : item.type === "calendar" ? "Календарь" : item.type === "file" ? "Файл" : "Доска"
      return `${item.title} ${item.description || ""} ${typeLabel}`.toLowerCase().includes(boardSearch.toLowerCase())
    })
  }, [projectItems, currentFolderId, boardSearch])

  const getItemLink = (item: ProjectGridItem) => {
    if (item.type === "task_list") return `/teams/${teamLogin}/projects/${projectId}/tasks/${item.id}`
    if (item.type === "board") return `/teams/${teamLogin}/projects/${projectId}/boards/${item.id}`
    if (item.type === "file") return item.preview_url || item.download_url || ""
    if (item.type === "link") {
      const link = project?.links?.find((l) => l.id === item.id)
      return link?.url || ""
    }
    return ""
  }

  const getItemKindLabel = (item: ProjectGridItem) => {
    switch (item.type) {
      case "folder":
        return "Папка"
      case "task_list":
        return "Список задач"
      case "link":
        return "Ссылка"
      case "calendar":
        return "Календарь"
      case "file":
        return getFileKindLabel(item.file_kind)
      default:
        return "Доска"
    }
  }

  const resetCreate = () => {
    setCreateOpen(false)
    setCreateStep("choose")
    setCreateType(null)
    setCreateName("")
    setCreateDescription("")
    setCreateParentId(null)
    setLinkUrl("")
    setLinkComment("")
    setFormError("")
    setSubmitting(false)
  }

  const openCreate = (type?: ProjectCreateType, parentId?: string | null) => {
    setCreateOpen(true)
    setCreateStep(type ? "form" : "choose")
    setCreateType(type || null)
    setCreateParentId(parentId ?? null)
    setFormError("")
  }

  const handleCreate = async () => {
    if (!teamLogin || !projectId || submitting) return
    setSubmitting(true)
    setFormError("")

    try {
      if (createType === "folder") {
        if (!createName.trim()) {
          setFormError("Укажите название папки")
          return
        }
        const folder = await createFolder(projectId, {
          name: createName.trim(),
          parent_id: createParentId,
        })
        if (!folder) throw new Error("folder_create_failed")
        await refreshProject()
        resetCreate()
        return
      }

      if (createType === "link") {
        if (!createName.trim() || !linkUrl.trim()) {
          setFormError("Укажите название и URL ссылки")
          return
        }
        const form = new URLSearchParams()
        form.append("title", createName.trim())
        form.append("url", linkUrl.trim())
        if (linkComment.trim()) form.append("comment", linkComment.trim())
        if (createParentId) form.append("parent_id", createParentId)
        const { data } = await api.post(
          `/main/links/create/?team_login=${teamLogin}&project_id=${projectId}`,
          form,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
        if (!data.status) throw new Error(data?.error || "link_create_failed")
        await refreshProject()
        resetCreate()
        return
      }

      if (!createName.trim()) {
        setFormError("Укажите название")
        return
      }

      if (createType === "board") {
      const board = await createBoard(projectId, {
        name: createName.trim(),
        description: createDescription.trim(),
        parent_id: createParentId,
      })
        if (!board) throw new Error("board_create_failed")
        await refreshProject()
        resetCreate()
        navigate(`/teams/${teamLogin}/projects/${projectId}/boards/${board.id}`)
        return
      }

      const form = new URLSearchParams()
      form.append("name", createName.trim())
      form.append("description", createDescription.trim())
      form.append("project_id", projectId)
      if (createParentId) form.append("parent_id", createParentId)
      form.append("view_type", createType === "calendar" ? "calendar" : "kanban")
      const { data } = await api.post(
        `/main/task/createList/?team_login=${teamLogin}`,
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      if (!data.status || !data.data?.id) throw new Error(data?.error || "board_create_failed")
      await refreshProject()
      resetCreate()
      navigate(`/teams/${teamLogin}/projects/${projectId}/tasks/${data.data.id}`)
    } catch (error) {
      console.error("Failed to create project item:", error)
      setFormError("Не удалось создать объект")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-12 w-80" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
            Проекты
          </Link>
          <ChevronRight className="size-4" />
          <span>Проект не найден</span>
        </div>
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">Проект не найден или был удалён</p>
          <Button className="mt-4" onClick={() => navigate(`/teams/${teamLogin}/projects`)}>
            Вернуться к проектам
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-6 p-4 lg:p-6"
      onClick={() => setContextMenu(null)}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
        setDragActive(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.length) {
          handlePickedFiles(e.dataTransfer.files)
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handlePickedFiles(e.target.files)
          }
          e.target.value = ""
        }}
      />
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  {project.img_url ? (
                    <img src={project.img_url} alt={project.name} className="h-full w-full object-cover" />
                  ) : (
                    <Box className="size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to={`/teams/${teamLogin}/projects`} className="hover:text-foreground">
                  Проекты
                </Link>
                <ChevronRight className="size-4" />
                <span className="font-medium text-foreground">{project.name}</span>
                {currentFolder && (
                  <>
                    <ChevronRight className="size-4" />
                    <span className="font-medium text-foreground">{currentFolder.title}</span>
                  </>
                )}
                  </div>
                  <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
                  {project.description ? (
                    <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
                  ) : null}
                </div>
              </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/teams/${teamLogin}/projects/${project.id}/settings`)}>
              <Settings className="mr-2 size-4" />
              Настройки
            </Button>
            <Button onClick={() => openCreate(undefined, currentFolderId)}>
              <Plus className="mr-2 size-4" />
              Создать
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Box className="size-4 text-muted-foreground" />
              <span>{visibleItems.length}</span>
              <span className="text-muted-foreground">
                {visibleItems.length === 1 ? "объект" : visibleItems.length < 5 ? "объекта" : "объектов"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentFolderPath.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {currentFolderPath.map((part, index) => (
                    <span key={`${part}-${index}`} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="size-4" />}
                      <span className={index === currentFolderPath.length - 1 ? "font-medium text-foreground" : ""}>
                        {part}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Поиск по всем объектам..."
                className="pl-9"
              />
            </div>
            <Select value={boardSort} onValueChange={(value) => setBoardSort(value as BoardSort)}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">
                  <span className="flex items-center gap-2"><CalendarArrowDown className="size-4" /> Последние изменения</span>
                </SelectItem>
                <SelectItem value="updated_asc">
                  <span className="flex items-center gap-2"><CalendarArrowUp className="size-4" /> Сначала старые</span>
                </SelectItem>
                <SelectItem value="name_asc">
                  <span className="flex items-center gap-2"><ArrowUpAZ className="size-4" /> Название (А-Я)</span>
                </SelectItem>
                <SelectItem value="name_desc">
                  <span className="flex items-center gap-2"><ArrowUpZA className="size-4" /> Название (Я-А)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div
        className={`relative min-h-[420px] rounded-3xl border border-dashed transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-transparent"}`}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, parentId: currentFolderId })
        }}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/70 text-sm font-medium text-muted-foreground backdrop-blur-sm">
            Отпустите файлы, чтобы загрузить их в проект
          </div>
        )}
        {visibleItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {visibleItems.map((item) => {
              const Icon = getProjectItemIcon(item.type, item.file_kind)
              const useProxy = fileImageFallbacks[item.id] || false
              const imageSrc = useProxy
                ? (item.preview_url || item.public_url || "")
                : (item.public_url || item.preview_url || "")
              const isImageFile = item.type === "file" && item.file_kind === "image" && Boolean(imageSrc)
              const kindLabel = item.type === "file" ? getFileKindLabel(item.file_kind) : getItemKindLabel(item)
              const openContextMenu = (x: number, y: number) => {
                setContextMenu({ x, y, itemId: item.id, parentId: item.parent_id })
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.type === "folder") {
                      setCurrentFolderId(item.id)
                      return
                    }
                    if (item.type === "file") {
                      setPreviewItem(item)
                      setPreviewImageUseProxy(false)
                      return
                    }
                    const href = getItemLink(item)
                    if (!href) return
                    if (item.type === "link") {
                      window.open(href, "_blank", "noreferrer")
                      return
                    }
                    navigate(href)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id, parentId: item.parent_id })
                  }}
                  className={`group relative flex min-h-[220px] flex-col overflow-hidden rounded-3xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${isImageFile ? "border-transparent bg-zinc-950/90 text-white shadow-xl" : "bg-background p-4 hover:bg-muted/40"}`}
                  style={{ marginLeft: item.depth ? `${Math.min(item.depth, 3) * 8}px` : undefined }}
                >
                  <button
                    type="button"
                    className={`absolute right-3 top-3 z-20 inline-flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors ${isImageFile ? "border-white/15 bg-background/70 text-foreground backdrop-blur-md hover:bg-background" : "border-border bg-background text-foreground hover:bg-muted"}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                      openContextMenu(rect.right - 4, rect.bottom + 4)
                    }}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {isImageFile ? (
                    <>
                      <div className="absolute inset-0">
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="h-full w-full scale-110 object-cover blur-2xl brightness-75"
                          onError={() => {
                            if (!useProxy && item.preview_url) {
                              setFileImageFallbacks((prev) => ({ ...prev, [item.id]: true }))
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10" />
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-contain p-4"
                          onError={() => {
                            if (!useProxy && item.preview_url) {
                              setFileImageFallbacks((prev) => ({ ...prev, [item.id]: true }))
                            }
                          }}
                        />
                      </div>
                      <div className="relative z-10 mt-auto">
                        <div className="rounded-t-3xl border-t border-white/10 bg-background/75 p-4 backdrop-blur-2xl">
                          <div className="space-y-2">
                            <div className="truncate text-lg font-semibold text-foreground">
                              {item.title}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(item.size_bytes)}</span>
                              <span>{formatDate(item.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {kindLabel}
                        </span>
                      </div>
                      <div className="mt-3 min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        {item.type !== "file" && item.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {item.type === "folder" ? (
                            <span>{item.children.length} внутри</span>
                          ) : item.type === "file" ? (
                            <span>{formatFileSize(item.size_bytes)}</span>
                          ) : (
                            <span />
                          )}
                          {item.type === "link" && getItemLink(item) && (
                            <button
                              type="button"
                              className="rounded-full border px-3 py-1 text-[11px] font-medium hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(getItemLink(item), "_blank", "noreferrer")
                              }}
                            >
                              Перейти
                            </button>
                          )}
                        </div>
                        <span>{formatDate(item.updated_at)}</span>
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center">
            <div className="max-w-md text-center text-muted-foreground">
              <FolderPlus className="mx-auto mb-3 size-10" />
              <p className="font-medium text-foreground">Пока нет объектов</p>
              <p className="mt-1 text-sm">
                Создайте папку, список задач, ссылку или доску, чтобы начать собирать структуру проекта.
              </p>
              <Button className="mt-4" onClick={() => openCreate(undefined, currentFolderId)}>
                <Plus className="mr-2 size-4" />
                Создать первый объект
              </Button>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[220px] rounded-2xl border bg-card p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {currentItem ? (
            <>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  if (currentItem.type === "folder") {
                    setCurrentFolderId(currentItem.id)
                  } else {
                    if (currentItem.type === "file") {
                      setPreviewItem(currentItem)
                      setContextMenu(null)
                      return
                    }
                    const href = getItemLink(currentItem)
                    if (href) {
                      if (currentItem.type === "link") {
                        window.open(href, "_blank", "noreferrer")
                      } else {
                        navigate(href)
                      }
                    }
                  }
                  setContextMenu(null)
                }}
              >
                <SquareStack className="size-4" />
                Открыть
              </button>
              {currentItem.type === "file" && currentItem.download_url && (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    window.open(currentItem.download_url || undefined, "_blank", "noreferrer")
                    setContextMenu(null)
                  }}
                >
                  <Download className="size-4" />
                  Скачать
                </button>
              )}
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setRenameItemId(currentItem.project_item_id || currentItem.id)
                  setRenameValue(currentItem.title)
                  setRenameOpen(true)
                  setContextMenu(null)
                }}
              >
                <Pencil className="size-4" />
                Переименовать
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMoveItemId(currentItem.project_item_id || currentItem.id)
                  setMoveTargetParentId(currentItem.parent_id)
                  setMoveOpen(true)
                  setContextMenu(null)
                }}
              >
                <MoveRight className="size-4" />
                Переместить
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (window.confirm("Вы точно уверены?")) {
                    await deleteItem(currentItem.project_item_id || currentItem.id)
                    await refreshProject()
                  }
                  setContextMenu(null)
                }}
              >
                <Trash2 className="size-4" />
                Удалить
              </button>
            </>
          ) : (
            <>
              {canOpenUploadEntry && (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    openUploadPicker(contextMenu.parentId ?? null)
                    setContextMenu(null)
                  }}
                >
                  <UploadCloud className="size-4" />
                  Загрузить
                </button>
              )}
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("folder", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <FolderPlus className="size-4" />
                Создать папку
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("task_list", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <ListTodo className="size-4" />
                Создать список задач
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("link", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <Link2 className="size-4" />
                Создать ссылку
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("board", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <SquareStack className="size-4" />
                Создать доску
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { openCreate("calendar", contextMenu.parentId ?? null); setContextMenu(null) }}
              >
                <Calendar className="size-4" />
                Создать календарь
              </button>
            </>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : resetCreate())}>
        <DialogContent className={createType === "folder" ? "sm:max-w-[420px]" : "sm:max-w-[640px]"}>
          <DialogHeader>
            <DialogTitle>Создать объект</DialogTitle>
            <DialogDescription>
              {createStep === "choose"
                ? "Сначала выберите, что вы хотите создать."
                : createType === "folder"
                  ? "Введите название папки."
                  : "Задайте название и параметры объекта."}
            </DialogDescription>
          </DialogHeader>

          {createStep === "choose" ? (
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              {[
                { type: "folder" as const, title: "Папка", icon: FolderPlus, description: "Группировка объектов" },
                { type: "task_list" as const, title: "Список задач", icon: ListTodo, description: "Обычный список или канбан" },
                { type: "link" as const, title: "Ссылка", icon: Link2, description: "Внешняя ссылка" },
                { type: "board" as const, title: "Доска", icon: SquareStack, description: "Excalidraw / whiteboard" },
                { type: "calendar" as const, title: "Календарь", icon: Calendar, description: "Список с календарным видом" },
                ...(canOpenUploadEntry ? [{ type: "file" as const, title: "Загрузить", icon: UploadCloud, description: "Файлы, документы, архивы" }] : []),
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    type="button"
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40 ${createType === item.type ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => {
                      if (item.type === "file") {
                        const targetParentId = createParentId
                        setCreateOpen(false)
                        setCreateType(null)
                        openUploadPicker(targetParentId)
                        return
                      }
                      setCreateType(item.type)
                      setFormError("")
                    }}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Название *</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Введите название"
                  autoFocus
                />
              </div>
              {createType !== "folder" && createType !== "link" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Описание</label>
                  <Textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={3}
                    placeholder="Необязательно"
                  />
                </div>
              )}
              {createType === "link" && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">URL *</label>
                    <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Комментарий</label>
                    <Textarea value={linkComment} onChange={(e) => setLinkComment(e.target.value)} rows={3} placeholder="Необязательно" />
                  </div>
                </>
              )}
              {createParentId && (
                <div className="rounded-2xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Создание внутри папки: {folderItems.find((item) => item.id === createParentId)?.title || "папка"}
                </div>
              )}
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => (createStep === "choose" ? resetCreate() : setCreateStep("choose"))} disabled={submitting}>
              {createStep === "choose" ? "Отмена" : "Назад"}
            </Button>
            {createStep === "choose" ? (
              <Button onClick={() => createType && setCreateStep("form")} disabled={!createType || submitting}>
                Продолжить
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Создание..." : "Создать"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : closeUploadDialog())}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Загрузка файлов</DialogTitle>
            <DialogDescription>
              Проверьте названия файлов и отправьте их в проект.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedFiles.length} файл(ов)</span>
                <span>{formatFileSize(selectedUploadBytes)} из {formatFileSize(availableBytes)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, availableBytes > 0 ? (selectedUploadBytes / availableBytes) * 100 : 0)}%` }}
              />
            </div>
            {!canUploadSelected && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                В диске команды недостаточно места для загрузки этих файлов.
              </div>
            )}

            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {selectedFiles.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {item.kind === "image" ? <FileImage className="size-5" /> : item.kind === "video" ? <FileVideo className="size-5" /> : item.kind === "archive" ? <FileArchive className="size-5" /> : item.kind === "code" ? <FileCode2 className="size-5" /> : item.kind === "spreadsheet" ? <FileSpreadsheet className="size-5" /> : item.kind === "presentation" ? <Presentation className="size-5" /> : <FileText className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{item.file.name}</div>
                        <button
                          type="button"
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setSelectedFiles((prev) => prev.filter((file) => file.id !== item.id))}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={item.displayName}
                          onChange={(e) => {
                            const value = e.target.value
                            setSelectedFiles((prev) => prev.map((file) => file.id === item.id ? { ...file, displayName: value } : file))
                          }}
                          className="sm:max-w-sm"
                        />
                        <span className="text-sm text-muted-foreground">{formatFileSize(item.size)}</span>
                        <span className="text-sm text-muted-foreground">{item.kind}</span>
                      </div>
                      <div className="mt-3">
                        <Progress value={uploadProgress[item.id] || 0} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {uploadMessage && <p className="text-sm text-destructive">{uploadMessage}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={closeUploadDialog} disabled={uploading}>
              Отмена
            </Button>
            {canUploadSelected ? (
              <Button onClick={uploadFiles} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? "Загрузка..." : "Загрузить"}
              </Button>
            ) : (
              <Button disabled>
                Нет места
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>{previewItem?.title || "Просмотр файла"}</DialogTitle>
            <DialogDescription>
              {previewItem ? `${getItemKindLabel(previewItem)} • ${formatFileSize(previewItem.size_bytes)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {previewItem?.type === "file" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  {previewItem.download_url && (
                    <Button size="sm" variant="outline" onClick={() => window.open(previewItem.download_url || undefined, "_blank", "noreferrer")}>
                      <Download className="mr-2 size-4" />
                      Скачать
                    </Button>
                  )}
                </div>
                {previewItem.file_kind === "image" && (previewItem.preview_url || previewItem.public_url) ? (
                  <img
                    src={previewImageUseProxy ? (previewItem.preview_url || previewItem.public_url || "") : (previewItem.public_url || previewItem.preview_url || "")}
                    alt={previewItem.title}
                    className="max-h-[70vh] w-full rounded-2xl object-contain"
                    onError={() => {
                      if (!previewImageUseProxy && previewItem.preview_url) {
                        setPreviewImageUseProxy(true)
                      }
                    }}
                  />
                ) : previewItem.file_kind === "video" && (previewItem.preview_url || previewItem.public_url) ? (
                  <video src={previewItem.preview_url || previewItem.public_url || ""} controls className="max-h-[70vh] w-full rounded-2xl" />
                ) : previewItem.file_kind === "pdf" && (previewItem.preview_url || previewItem.public_url) ? (
                  <iframe src={previewItem.preview_url || previewItem.public_url || ""} className="h-[70vh] w-full rounded-2xl border-0" />
                ) : (previewItem.preview_url || previewItem.public_url) ? (
                  <iframe src={previewItem.preview_url || previewItem.public_url || ""} className="h-[70vh] w-full rounded-2xl border-0" />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Предпросмотр недоступен</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={(open) => { if (!open) setRenameOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!renameItemId || !renameValue.trim()) return
                await renameItem(renameItemId, renameValue.trim())
                await refreshProject()
                setRenameOpen(false)
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={(open) => { if (!open) setMoveOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить</DialogTitle>
            <DialogDescription>Выберите папку назначения или оставьте в корне.</DialogDescription>
          </DialogHeader>
          <Select value={moveTargetParentId || "__root__"} onValueChange={(value) => setMoveTargetParentId(value === "__root__" ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Куда переместить" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">Корень</SelectItem>
              {folderItems.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!moveItemId) return
                await moveItem(moveItemId, moveTargetParentId)
                await refreshProject()
                setMoveOpen(false)
              }}
            >
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
