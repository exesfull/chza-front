import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type OfficeDocType = "word" | "cell" | "slide" | "pdf"

export interface ProjectOfficeFileItem {
  id: string
  project_item_id?: string
  title: string
  file_kind?: string | null
  public_url?: string | null
  original_name?: string | null
  updated_at?: string | null
  mime_type?: string | null
}

interface OnlyOfficeFileEditorProps {
  open: boolean
  teamLogin?: string
  projectId?: string
  item: ProjectOfficeFileItem | null
  onClose: () => void
  onSaved: () => void | Promise<void>
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null
}

type SaveMode = "replace" | "copy"

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, config: Record<string, unknown>) => {
        destroyEditor: () => void
        downloadAs: (format?: string) => void
      }
    }
  }
}

const SCRIPT_ID = "onlyoffice-docs-api"

function getOfficeDocumentType(kind?: string | null): OfficeDocType | null {
  switch (kind) {
    case "document":
    case "text":
    case "code":
      return "word"
    case "spreadsheet":
      return "cell"
    case "presentation":
      return "slide"
    case "pdf":
      return "pdf"
    default:
      return null
  }
}

function getFileExtension(name: string): string {
  const match = name.match(/\.([^.]+)$/)
  return match?.[1]?.toLowerCase() || ""
}

function splitFileName(fileName: string): { base: string; ext: string } {
  const index = fileName.lastIndexOf(".")
  if (index <= 0) {
    return { base: fileName, ext: "" }
  }
  return {
    base: fileName.slice(0, index),
    ext: fileName.slice(index),
  }
}

function incrementFileName(name: string): string {
  const { base, ext } = splitFileName(name)
  const match = base.match(/^(.*?)(?:\s\((\d+)\))?$/)
  const prefix = match?.[1] ?? base
  const current = match?.[2] ? Number(match[2]) : 0
  const next = current > 0 ? current + 1 : 1
  return `${prefix} (${next})${ext}`
}

async function loadOnlyOfficeScript(serverUrl: string): Promise<void> {
  const normalized = serverUrl.replace(/\/$/, "")
  if (window.DocsAPI) return

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("onlyoffice_script_failed")), { once: true })
    })
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = `${normalized}/web-apps/apps/api/documents/api.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("onlyoffice_script_failed"))
    document.head.appendChild(script)
  })
}

export function OnlyOfficeFileEditor({
  open,
  teamLogin,
  projectId,
  item,
  onClose,
  onSaved,
  user,
}: OnlyOfficeFileEditorProps) {
  const editorRef = useRef<{ destroyEditor: () => void; downloadAs: (format?: string) => void } | null>(null)
  const saveModeRef = useRef<SaveMode>("replace")
  const pendingSaveAsNameRef = useRef<string>("")
  const [loadingScript, setLoadingScript] = useState(false)
  const [scriptError, setScriptError] = useState("")
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState("Редактор готов")

  const documentServerUrl = (import.meta.env.VITE_ONLYOFFICE_DOCUMENT_SERVER_URL || "").trim()
  const editorUrl = useMemo(() => (documentServerUrl ? documentServerUrl.replace(/\/$/, "") : ""), [documentServerUrl])
  const documentType = useMemo(() => getOfficeDocumentType(item?.file_kind), [item?.file_kind])

  useEffect(() => {
    if (!open || !item || !editorUrl || !documentType) {
      return
    }

    let cancelled = false

    const init = async () => {
      setLoadingScript(true)
      setScriptError("")
      try {
        await loadOnlyOfficeScript(editorUrl)
        if (cancelled) return

        if (editorRef.current) {
          editorRef.current.destroyEditor()
          editorRef.current = null
        }

        const fileName = item.original_name || item.title
        const key = `${item.project_item_id || item.id}:${item.updated_at || "0"}`
        const sourceUrl = item.public_url || ""

        if (!sourceUrl) {
          setScriptError("У файла нет публичного URL для открытия в редакторе")
          return
        }

        const config: Record<string, unknown> = {
          documentType,
          type: "embedded",
          width: "100%",
          height: "100%",
          document: {
            title: fileName,
            url: sourceUrl,
            fileType: getFileExtension(fileName) || (documentType === "word" ? "docx" : documentType === "cell" ? "xlsx" : documentType === "slide" ? "pptx" : "pdf"),
            key,
          },
          editorConfig: {
            mode: "edit",
            lang: "ru",
            callbackUrl: `${window.location.origin}/api/office/callback`,
            user: user
              ? {
                  id: user.id,
                  name: `${user.last_name} ${user.first_name}`.trim() || user.email,
                }
              : {
                  id: "unknown",
                  name: "Пользователь",
                },
            customization: {
              forcesave: false,
              toolbar: true,
              compactToolbar: false,
              plugins: false,
              rightMenu: true,
              spellcheck: true,
            },
          },
          events: {
            onAppReady: () => setSaveNotice("Редактор готов"),
            onDocumentReady: () => setSaveNotice("Документ открыт"),
            onRequestClose: () => {
              onClose()
            },
            onDownloadAs: async (event: { data?: { url?: string; fileType?: string } }) => {
              const url = event.data?.url || ""
              if (!url || !teamLogin || !projectId || !item) return
              setSaving(true)
              setSaveNotice("Сохраняем...")
              try {
                const formData = new FormData()
                formData.append("team_login", teamLogin)
                formData.append("project_id", projectId)
                formData.append("project_item_id", item.project_item_id || item.id)
                formData.append("source_url", url)
                formData.append("save_mode", saveModeRef.current)
                if (saveModeRef.current === "copy") {
                  formData.append("target_name", pendingSaveAsNameRef.current || saveAsName)
                }
                const { data } = await api.post("/main/project/saveOfficeFile/", formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                })
                if (data.status) {
                  setSaveNotice("Сохранено")
                  await onSaved()
                  onClose()
                } else {
                  setSaveNotice("Не удалось сохранить")
                }
              } catch (error) {
                console.error("Failed to save office file:", error)
                setSaveNotice("Не удалось сохранить")
              } finally {
                setSaving(false)
                saveModeRef.current = "replace"
                pendingSaveAsNameRef.current = ""
              }
            },
            onError: (event: { data?: { errorCode?: number; errorDescription?: string } }) => {
              console.error("ONLYOFFICE error:", event.data?.errorCode, event.data?.errorDescription)
            },
            onInfo: () => undefined,
          },
        }

        const DocsAPI = window.DocsAPI
        if (!DocsAPI) {
          throw new Error("onlyoffice_docsapi_missing")
        }

        editorRef.current = new DocsAPI.DocEditor("onlyoffice-editor-placeholder", config)
      } catch (error) {
        console.error("Failed to initialize ONLYOFFICE:", error)
        setScriptError("Не удалось загрузить редактор ONLYOFFICE")
      } finally {
        setLoadingScript(false)
      }
    }

    void init()

    return () => {
      cancelled = true
      if (editorRef.current) {
        editorRef.current.destroyEditor()
        editorRef.current = null
      }
    }
  }, [open, item, documentType, editorUrl, onClose, onSaved, projectId, teamLogin, user])

  useEffect(() => {
    if (!open) {
      setSaveAsOpen(false)
      setSaveAsName("")
      setSaveNotice("Редактор готов")
      saveModeRef.current = "replace"
      pendingSaveAsNameRef.current = ""
    }
  }, [open])

  if (!open || !item || !documentType) return null

  const currentName = item.original_name || item.title

  return (
    <div className="fixed inset-0 z-[80] bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">Редактирование файла</p>
            <h2 className="truncate text-lg font-semibold">{currentName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">{saving ? "Сохраняем..." : saveNotice}</span>
            <Button variant="outline" onClick={onClose}>
              Не сохранять
            </Button>
            <Button
              onClick={() => {
                saveModeRef.current = "replace"
                pendingSaveAsNameRef.current = currentName
                editorRef.current?.downloadAs()
              }}
              disabled={loadingScript || saving}
            >
              Сохранить
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const nextName = incrementFileName(currentName)
                setSaveAsName(nextName)
                setSaveAsOpen(true)
              }}
              disabled={loadingScript || saving}
            >
              Сохранить как
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-muted/20">
          {editorUrl && !scriptError ? (
            <div id="onlyoffice-editor-placeholder" className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {scriptError || "Редактор недоступен"}
            </div>
          )}
        </div>
      </div>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сохранить как</DialogTitle>
            <DialogDescription>Введите новое имя файла. Расширение можно оставить.</DialogDescription>
          </DialogHeader>
          <Input value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                const name = saveAsName.trim()
                if (!name) return
                saveModeRef.current = "copy"
                pendingSaveAsNameRef.current = name
                setSaveAsOpen(false)
                editorRef.current?.downloadAs()
              }}
            >
              Сохранить копию
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
