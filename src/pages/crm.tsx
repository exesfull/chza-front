import { useEffect, useMemo, useState, type ComponentType } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  BarChart3,
  Building2,
  ChevronRight,
  Copy,
  FileText,
  History,
  Layers3,
  Loader2,
  Pencil,
  Package,
  Plus,
  Search,
  Sparkles,
  MessageSquare,
  Users,
  Wallet,
  Trash2,
  X,
} from "lucide-react"
import { useCrm, type CrmDetail, type CrmLead } from "@/hooks/use-crm"
import { useTeamMembers } from "@/hooks/use-team-members"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type CrmTab = "leads" | "contacts" | "products" | "documents" | "finances" | "stats"
type LeadSheetTab = "chat" | "info" | "history"
const EMPTY_VALUE = "__none__"

const TABS: Array<{ key: CrmTab; title: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "leads", title: "Лиды", icon: Layers3 },
  { key: "contacts", title: "Контакты", icon: Users },
  { key: "products", title: "Товары", icon: Package },
  { key: "documents", title: "Документы", icon: FileText },
  { key: "finances", title: "Финансы", icon: Wallet },
  { key: "stats", title: "Статистика", icon: BarChart3 },
]

function formatMoney(value: number | null | undefined): string {
  const n = Number(value || 0)
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б"
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"]
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : 1
  return `${size.toFixed(digits)} ${units[unit]}`
}

function normalizeDecimalInput(value: string): string {
  const cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "")
  const [whole, ...rest] = cleaned.split(".")
  if (rest.length === 0) return whole
  const fraction = rest.join("").slice(0, 2)
  return `${whole}.${fraction}`
}

function contactDisplayName(contact: {
  type: "person" | "company"
  first_name: string | null
  last_name: string | null
  company_name_short: string | null
  company_name_full: string | null
}): string {
  return contact.type === "company"
    ? contact.company_name_short || contact.company_name_full || "Контакт"
    : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"
}

export function CrmPage() {
  const navigate = useNavigate()
  const { teamLogin, crmId } = useParams()
  const { members: teamMembers } = useTeamMembers(teamLogin)
  const {
    crms,
    loading,
    getCrm,
    createCrm,
    createLead,
    updateLead,
    deleteLead,
    getLeadHistory,
    listLeadMessages,
    sendLeadMessage,
    createContact,
    updateContact,
    lookupOrganization,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    createStage,
    updateStage,
    deleteStage,
    uploadDocuments,
    createFinance,
    updateFinance,
  } = useCrm(teamLogin)

  const [activeTab, setActiveTab] = useState<CrmTab>("leads")
  const [search, setSearch] = useState("")
  const [selectedCrm, setSelectedCrm] = useState<CrmDetail | null>(null)
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)
  const [selectedLeadTab, setSelectedLeadTab] = useState<LeadSheetTab>("info")
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<Array<{ id: string; reason: string | null; snapshot: unknown; created_at: string | null }>>([])
  const [selectedLeadMessages, setSelectedLeadMessages] = useState<Array<{ id: string; crm_id: string; lead_id: string; user_id: string | null; role: string; content: string; user_name: string | null; user_img_url: string | null; created_at: string | null; updated_at: string | null }>>([])
  const [leadMessageDraft, setLeadMessageDraft] = useState("")
  const [leadMessageSending, setLeadMessageSending] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [stageEditorOpen, setStageEditorOpen] = useState(false)
  const [stageEditorSaving, setStageEditorSaving] = useState(false)
  const [stageDrafts, setStageDrafts] = useState<Array<{ id?: string; name: string; sort_order: number }>>([])
  const [productEditOpen, setProductEditOpen] = useState(false)
  const [productEditLoading, setProductEditLoading] = useState(false)
  const [productEditId, setProductEditId] = useState("")
  const [financeEditOpen, setFinanceEditOpen] = useState(false)
  const [financeEditLoading, setFinanceEditLoading] = useState(false)
  const [financeEditId, setFinanceEditId] = useState("")

  const [createCrmOpen, setCreateCrmOpen] = useState(false)
  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const [createProductOpen, setCreateProductOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false)
  const [createFinanceOpen, setCreateFinanceOpen] = useState(false)

  const [newCrmName, setNewCrmName] = useState("")
  const [newCrmDescription, setNewCrmDescription] = useState("")

  const [leadForm, setLeadForm] = useState({ title: "", description: "", stage_id: "", responsible_user_id: "" })
  const [leadContacts, setLeadContacts] = useState<string[]>([])
  const [leadProducts, setLeadProducts] = useState<Array<{ product_id: string; quantity: number; price: string; discount_type: string; discount_value: string }>>([])

  const [contactForm, setContactForm] = useState({
    type: "person",
    first_name: "",
    last_name: "",
    patronymic: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    company_name_full: "",
    company_name_short: "",
    inn: "",
    kpp: "",
    ogrn: "",
  })
  const [contactLookupLoading, setContactLookupLoading] = useState(false)
  const [contactEditOpen, setContactEditOpen] = useState(false)
  const [contactEditLoading, setContactEditLoading] = useState(false)
  const [contactEditForm, setContactEditForm] = useState({
    id: "",
    type: "person",
    first_name: "",
    last_name: "",
    patronymic: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    company_name_full: "",
    company_name_short: "",
    inn: "",
    kpp: "",
    ogrn: "",
  })

  const [productForm, setProductForm] = useState({ name: "", price: "", cost_price: "", description: "" })
  const [categoryName, setCategoryName] = useState("")
  const [documentUploadCategoryId, setDocumentUploadCategoryId] = useState("")
  const [documentUploadFiles, setDocumentUploadFiles] = useState<File[]>([])
  const [documentUploadLoading, setDocumentUploadLoading] = useState(false)
  const [documentUploadLeadId, setDocumentUploadLeadId] = useState("")
  const [financeForm, setFinanceForm] = useState({ category: "", date: "", amount: "", from_contact_id: "", to_contact_id: "", note: "", lead_id: "" })

  const stages = selectedCrm?.stages || []
  const leads = selectedCrm?.leads || []
  const contacts = selectedCrm?.contacts || []
  const products = selectedCrm?.products || []
  const documentCategories = selectedCrm?.document_categories || []
  const documents = selectedCrm?.documents || []
  const finances = selectedCrm?.finances || []
  const stats = selectedCrm?.stats || null

  useEffect(() => {
    document.title = crmId ? "CRM" : "CRM"
  }, [crmId])

  useEffect(() => {
    if (!crmId) {
      setSelectedCrm(null)
      return
    }
    let cancelled = false
    getCrm(crmId).then((detail) => {
      if (!cancelled) {
        setSelectedCrm(detail)
        if (detail) {
          setLeadForm((prev) => ({ ...prev, stage_id: detail.stages[0]?.id || "" }))
          setStageDrafts(detail.stages.map((stage) => ({ id: stage.id, name: stage.name, sort_order: stage.sort_order })))
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [crmId, getCrm])

  const filteredCrms = useMemo(() => {
    const q = search.toLowerCase()
    return crms.filter((crm) => `${crm.name} ${crm.description || ""}`.toLowerCase().includes(q))
  }, [crms, search])

  const leadsByStage = useMemo(() => {
    const map = new Map<string, CrmLead[]>()
    stages.forEach((stage) => map.set(stage.id, []))
    leads.forEach((lead) => {
      const key = lead.stage_id || ""
      const arr = map.get(key)
      if (arr) arr.push(lead)
    })
    return map
  }, [stages, leads])

  const stageSums = useMemo(() => {
    const sums = new Map<string, number>()
    stages.forEach((stage) => sums.set(stage.id, 0))
    leads.forEach((lead) => {
      const key = lead.stage_id || ""
      if (!sums.has(key)) return
      const amount = Number(lead.amount ?? lead.products_total ?? 0)
      sums.set(key, (sums.get(key) || 0) + amount)
    })
    return sums
  }, [stages, leads])

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((contact) => {
      const fields = [
        contactDisplayName(contact),
        contact.email,
        contact.phone,
        contact.position,
        contact.inn,
        contact.kpp,
        contact.ogrn,
        contact.address,
      ]
      return fields.filter(Boolean).some((value) => String(value).toLowerCase().includes(q))
    })
  }, [contacts, contactSearch])

  const activeCrm = selectedCrm || null
  const selectedLeadDocuments = useMemo(
    () => documents.filter((document) => document.lead_id === selectedLead?.id),
    [documents, selectedLead?.id]
  )
  const selectedLeadFinances = useMemo(
    () => finances.filter((finance) => finance.lead_id === selectedLead?.id),
    [finances, selectedLead?.id]
  )

  useEffect(() => {
    if (!selectedLead || !crmId) {
      setSelectedLeadHistory([])
      setSelectedLeadMessages([])
      setSelectedLeadTab("info")
      return
    }

    let cancelled = false
    void getLeadHistory(crmId, selectedLead.id).then((items) => {
      if (!cancelled) {
        setSelectedLeadHistory(items as Array<{ id: string; reason: string | null; snapshot: unknown; created_at: string | null }>)
      }
    })
    void listLeadMessages(crmId, selectedLead.id).then((items) => {
      if (!cancelled) {
        setSelectedLeadMessages(items)
      }
    })

    return () => {
      cancelled = true
    }
  }, [crmId, getLeadHistory, listLeadMessages, selectedLead])

  const refreshDetail = async () => {
    if (!crmId) return
    const detail = await getCrm(crmId)
    if (detail) {
      setSelectedCrm(detail)
    }
  }

  const handleCreateCrm = async () => {
    if (!newCrmName.trim()) return
    const crm = await createCrm({ name: newCrmName.trim(), description: newCrmDescription.trim() })
    if (crm) {
      setCreateCrmOpen(false)
      setNewCrmName("")
      setNewCrmDescription("")
      navigate(`/teams/${teamLogin}/crm/${crm.id}`)
    }
  }

  const openStageEditor = () => {
    setStageDrafts(stages.map((stage) => ({ id: stage.id, name: stage.name, sort_order: stage.sort_order })))
    setStageEditorOpen(true)
  }

  const handleSaveStages = async () => {
    if (!crmId) return
    setStageEditorSaving(true)
    try {
      for (const draft of stageDrafts) {
        const name = draft.name.trim()
        if (name && draft.id) {
          await updateStage(crmId, draft.id, { name, sort_order: draft.sort_order })
        } else if (name && !draft.id) {
          await createStage(crmId, { name, sort_order: draft.sort_order })
        }
      }
      for (const stage of stages) {
        if (!stageDrafts.some((draft) => draft.id === stage.id)) {
          await deleteStage(crmId, stage.id)
        }
      }
      setStageEditorOpen(false)
      await refreshDetail()
    } finally {
      setStageEditorSaving(false)
    }
  }

  const handleCreateLead = async () => {
    if (!crmId || !leadForm.title.trim()) return
    const lead = await createLead(crmId, {
      title: leadForm.title.trim(),
      description: leadForm.description.trim(),
      stage_id: leadForm.stage_id || undefined,
      responsible_user_id: leadForm.responsible_user_id || undefined,
      contact_ids: JSON.stringify(leadContacts),
      product_items: JSON.stringify(leadProducts),
    })
    if (lead) {
      setCreateLeadOpen(false)
      setLeadForm({ title: "", description: "", stage_id: stages[0]?.id || "", responsible_user_id: "" })
      setLeadContacts([])
      setLeadProducts([])
      await refreshDetail()
    }
  }

  const handleContactLookup = async () => {
    if (!contactForm.inn.trim()) return
    setContactLookupLoading(true)
    const data = await lookupOrganization(contactForm.inn.trim())
    if (data) {
      const suggestion = data as { data?: Record<string, any>; unrestricted_value?: string; value?: string }
      const org = suggestion.data || {}
      setContactForm((prev) => ({
        ...prev,
        type: "company",
        company_name_full: org?.name?.full_with_opf || suggestion.value || prev.company_name_full,
        company_name_short: org?.name?.short_with_opf || suggestion.unrestricted_value || prev.company_name_short,
        kpp: org?.kpp || prev.kpp,
        ogrn: org?.ogrn || prev.ogrn,
        address: org?.address?.unrestricted_value || prev.address,
      }))
    }
    setContactLookupLoading(false)
  }

  const copyText = async (value: string | null | undefined) => {
    const text = (value || "").toString()
    if (!text) return
    await navigator.clipboard.writeText(text)
  }

  const openContactEditor = (contact: (typeof contacts)[number]) => {
    setContactEditForm({
      id: contact.id,
      type: contact.type,
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      patronymic: contact.patronymic || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      position: contact.position || "",
      company_name_full: contact.company_name_full || "",
      company_name_short: contact.company_name_short || "",
      inn: contact.inn || "",
      kpp: contact.kpp || "",
      ogrn: contact.ogrn || "",
    })
    setContactEditOpen(true)
  }

  const handleSaveContactEdit = async () => {
    if (!crmId || !contactEditForm.id) return
    setContactEditLoading(true)
    const updated = await updateContact(crmId, contactEditForm.id, contactEditForm)
    setContactEditLoading(false)
    if (updated) {
      setContactEditOpen(false)
      await refreshDetail()
      if (selectedLead) {
        const refreshedLead = await getCrm(crmId).then((detail) => detail?.leads.find((lead) => lead.id === selectedLead.id) || null)
        if (refreshedLead) setSelectedLead(refreshedLead)
      }
    }
  }

  const handleCreateContact = async () => {
    if (!crmId) return
    const contact = await createContact(crmId, contactForm)
    if (contact) {
      setCreateContactOpen(false)
      setContactForm({
        type: "person",
        first_name: "",
        last_name: "",
        patronymic: "",
        email: "",
        phone: "",
        address: "",
        position: "",
        company_name_full: "",
        company_name_short: "",
        inn: "",
        kpp: "",
        ogrn: "",
      })
      await refreshDetail()
    }
  }

  const handleCreateProduct = async () => {
    if (!crmId || !productForm.name.trim()) return
    const product = await createProduct(crmId, {
      name: productForm.name.trim(),
      price: productForm.price || undefined,
      cost_price: productForm.cost_price || undefined,
      description: productForm.description.trim(),
    })
    if (product) {
      setCreateProductOpen(false)
      setProductForm({ name: "", price: "", cost_price: "", description: "" })
      await refreshDetail()
    }
  }

  const openProductEditor = (product: { id: string; name: string; price: number | null; cost_price: number | null; description: string | null }) => {
    setProductEditId(product.id)
    setProductForm({
      name: product.name || "",
      price: product.price !== null ? String(product.price) : "",
      cost_price: product.cost_price !== null ? String(product.cost_price) : "",
      description: product.description || "",
    })
    setProductEditOpen(true)
  }

  const handleUpdateProduct = async () => {
    if (!crmId || !productEditId || !productForm.name.trim()) return
    setProductEditLoading(true)
    try {
      await updateProduct(crmId, productEditId, {
        name: productForm.name.trim(),
        price: productForm.price || undefined,
        cost_price: productForm.cost_price || undefined,
        description: productForm.description.trim(),
      })
      setProductEditOpen(false)
      await refreshDetail()
    } finally {
      setProductEditLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!crmId || !categoryName.trim()) return
    const category = await createCategory(crmId, categoryName.trim())
    if (category) {
      setCreateCategoryOpen(false)
      setCategoryName("")
      await refreshDetail()
    }
  }

  const handleUploadDocuments = async () => {
    if (!crmId || documentUploadFiles.length === 0) return
    setDocumentUploadLoading(true)
    try {
      const docs = await uploadDocuments(crmId, {
        category_id: documentUploadCategoryId || undefined,
        lead_id: documentUploadLeadId || undefined,
        files: documentUploadFiles,
      })
      if (docs.length > 0) {
        setCreateDocumentOpen(false)
        setDocumentUploadCategoryId("")
        setDocumentUploadLeadId("")
        setDocumentUploadFiles([])
        await refreshDetail()
      }
    } finally {
      setDocumentUploadLoading(false)
    }
  }

  const handleCreateFinance = async () => {
    if (!crmId || !financeForm.amount.trim()) return
    const finance = await createFinance(crmId, financeForm)
    if (finance) {
      setCreateFinanceOpen(false)
      setFinanceForm({ category: "", date: "", amount: "", from_contact_id: "", to_contact_id: "", note: "", lead_id: "" })
      await refreshDetail()
    }
  }

  const openFinanceEditor = (finance: { id: string; category: string | null; date: string | null; amount: number; from_contact_id: string | null; to_contact_id: string | null; note: string | null; lead_id: string | null }) => {
    setFinanceEditId(finance.id)
    setFinanceForm({
      category: finance.category || "",
      date: finance.date || "",
      amount: String(finance.amount ?? ""),
      from_contact_id: finance.from_contact_id || "",
      to_contact_id: finance.to_contact_id || "",
      note: finance.note || "",
      lead_id: finance.lead_id || selectedLead?.id || "",
    })
    setFinanceEditOpen(true)
  }

  const handleUpdateFinance = async () => {
    if (!crmId || !financeEditId || !financeForm.amount.trim()) return
    setFinanceEditLoading(true)
    try {
      await updateFinance(crmId, financeEditId, financeForm)
      setFinanceEditOpen(false)
      await refreshDetail()
    } finally {
      setFinanceEditLoading(false)
    }
  }

  const handleSendLeadMessage = async () => {
    if (!crmId || !selectedLead || !leadMessageDraft.trim()) return
    setLeadMessageSending(true)
    try {
      const message = await sendLeadMessage(crmId, selectedLead.id, leadMessageDraft.trim())
      if (message) {
        setSelectedLeadMessages((prev) => [...prev, message])
        setLeadMessageDraft("")
        await refreshDetail()
      }
    } finally {
      setLeadMessageSending(false)
    }
  }

  if (!teamLogin) return null

  if (!crmId) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">CRM</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Загрузка..." : `${crms.length} ${crms.length === 1 ? "CRM" : "CRM-систем"}`}
            </p>
          </div>
          <Button onClick={() => setCreateCrmOpen(true)}>
            <Plus className="mr-2 size-4" />
            Создать CRM
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск CRM..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="h-48 animate-pulse rounded-2xl border bg-muted/30" />) : filteredCrms.length > 0 ? filteredCrms.map((crm) => (
            <button
              key={crm.id}
              type="button"
              onClick={() => navigate(`/teams/${teamLogin}/crm/${crm.id}`)}
              className="group overflow-hidden rounded-2xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 border-b p-4">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  {crm.img_url ? <img src={crm.img_url} alt="" className="size-full object-cover" /> : <Building2 className="size-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold">{crm.name}</div>
                  <div className="line-clamp-2 text-sm text-muted-foreground">{crm.description || "Без описания"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-4 text-xs text-muted-foreground">
                <Badge variant="secondary">{crm.leads_count} лидов</Badge>
                <Badge variant="secondary">{crm.contacts_count} контактов</Badge>
                <Badge variant="secondary">{crm.products_count} товаров</Badge>
                <Badge variant="secondary">{crm.documents_count} документов</Badge>
              </div>
            </button>
          )) : (
            <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 size-10" />
              <p>Пока нет CRM</p>
            </div>
          )}
        </div>

        <Dialog open={createCrmOpen} onOpenChange={setCreateCrmOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Создать CRM</DialogTitle>
              <DialogDescription>CRM создаст отдельные подсистемы: контакты, товары, документы и финансы.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Название</label>
                <Input value={newCrmName} onChange={(e) => setNewCrmName(e.target.value)} placeholder="Название CRM" autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Описание</label>
                <Textarea value={newCrmDescription} onChange={(e) => setNewCrmDescription(e.target.value)} rows={3} placeholder="Описание CRM" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCrmOpen(false)}>Отмена</Button>
              <Button onClick={() => void handleCreateCrm()}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/teams/${teamLogin}`} className="hover:text-foreground">Главная</Link>
          <ChevronRight className="size-4" />
          <Link to={`/teams/${teamLogin}/crm`} className="hover:text-foreground">CRM</Link>
          <ChevronRight className="size-4" />
          <span className="font-medium text-foreground">{activeCrm?.name || "Загрузка..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openStageEditor}>
            <Pencil className="mr-2 size-4" />
            Редактировать колонки
          </Button>
          <Button onClick={() => setCreateLeadOpen(true)}>
            <Plus className="mr-2 size-4" />
            Создать лид
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Лиды", value: stats?.leads ?? 0 },
          { label: "Контакты", value: stats?.contacts ?? 0 },
          { label: "Товары", value: stats?.products ?? 0 },
          { label: "Документы", value: stats?.documents ?? 0 },
          { label: "Финансы", value: stats?.finances ?? 0 },
          { label: "Сумма", value: formatMoney(stats?.lead_amount ?? 0) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-2xl font-bold">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <Button key={tab.key} variant={activeTab === tab.key ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab.key)}>
              <Icon className="mr-2 size-4" />
              {tab.title}
            </Button>
          )
        })}
      </div>

      {activeTab === "leads" && (
        <div className="flex min-h-0 gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const stageLeads = leadsByStage.get(stage.id) || []
            const stageSum = stageSums.get(stage.id) || 0
            return (
              <div key={stage.id} className="flex min-w-[320px] max-w-[320px] flex-col rounded-2xl border bg-muted/20">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <div className="font-semibold">{stage.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{stageLeads.length} лидов</span>
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                        {formatMoney(stageSum)}
                      </Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => {
                    setLeadForm((prev) => ({ ...prev, stage_id: stage.id }))
                    setCreateLeadOpen(true)
                  }}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                  {stageLeads.length > 0 ? stageLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="rounded-2xl border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold">{lead.title}</div>
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.description || "Без описания"}</div>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          {formatMoney(lead.amount ?? lead.products_total)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {lead.contacts.slice(0, 2).map((contact) => (
                          <Badge key={contact.id} variant="secondary" className="text-[10px]">
                            {contact.type === "company" ? contact.company_name_short || contact.company_name_full || "Контакт" : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Нет лидов
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-semibold">Контакты</div>
              <div className="text-sm text-muted-foreground">Физические и юридические лица внутри CRM</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск контактов"
                  className="w-64 pl-9"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>
              <Button onClick={() => setCreateContactOpen(true)}><Plus className="mr-2 size-4" />Добавить контакт</Button>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => openContactEditor(contact)}
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="font-semibold">
                  {contactDisplayName(contact)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {contact.type === "company" ? contact.company_name_full : [contact.position, contact.email, contact.phone].filter(Boolean).join(" • ")}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-semibold">Товары</div>
              <div className="text-sm text-muted-foreground">Позиции для лидов и корзина товаров</div>
            </div>
            <Button onClick={() => setCreateProductOpen(true)}><Plus className="mr-2 size-4" />Добавить товар</Button>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button key={product.id} type="button" onClick={() => openProductEditor(product)} className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{product.name}</div>
                  <Pencil className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{product.description || "Без описания"}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-medium">
                  <Badge variant="secondary">{formatMoney(product.price)}</Badge>
                  <Badge variant="outline">Себестоимость: {formatMoney(product.cost_price)}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-semibold">Документы</div>
              <div className="text-sm text-muted-foreground">Категории, текстовые документы и прикреплённые файлы</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateCategoryOpen(true)}><Plus className="mr-2 size-4" />Категория</Button>
              <Button onClick={() => {
                setDocumentUploadLeadId("")
                setCreateDocumentOpen(true)
              }}><Plus className="mr-2 size-4" />Загрузить файлы</Button>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {documentCategories.map((category) => (
              <div key={category.id} className="rounded-2xl border p-4">
                <div className="font-semibold">{category.name}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {documents.filter((document) => document.category_id === category.id).length} документов
                </div>
                <div className="mt-3 space-y-2">
                  {documents.filter((document) => document.category_id === category.id).slice(0, 4).map((document) => (
                    <div key={document.id} className="rounded-xl border bg-background px-3 py-2 text-sm">
                      <div className="font-medium">{document.file_name || document.title}</div>
                      <div className="text-xs text-muted-foreground">{document.mime_type || "Файл"} • {formatFileSize(document.size_bytes)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "finances" && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-semibold">Финансы</div>
              <div className="text-sm text-muted-foreground">Операции по лидам</div>
            </div>
            <Button onClick={() => {
              setFinanceForm((prev) => ({ ...prev, lead_id: "" }))
              setCreateFinanceOpen(true)
            }}><Plus className="mr-2 size-4" />Добавить операцию</Button>
          </div>
          <div className="divide-y">
            {finances.map((finance) => (
              <button key={finance.id} type="button" onClick={() => openFinanceEditor(finance)} className="flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{finance.category || "Без категории"}</div>
                  <div className="text-sm text-muted-foreground">
                    {finance.from_contact_name || "—"} → {finance.to_contact_name || "—"}
                    {finance.lead_id ? ` • Лид: ${selectedCrm?.leads.find((lead) => lead.id === finance.lead_id)?.title || finance.lead_id}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatMoney(finance.amount)}</div>
                  <div className="text-xs text-muted-foreground">{finance.date || "—"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "stats" && stats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Стадий", value: stats.stages },
            { label: "Лидов", value: stats.leads },
            { label: "Контактов", value: stats.contacts },
            { label: "Товаров", value: stats.products },
            { label: "Документов", value: stats.documents },
            { label: "Оборот", value: formatMoney(stats.finance_amount) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-2xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={selectedLead !== null} onOpenChange={(open) => { if (!open) setSelectedLead(null) }}>
        <SheetContent side="right" className="w-full max-w-4xl p-0">
          {selectedLead && activeCrm && (
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{selectedLead.title}</SheetTitle>
                    <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                      <span>{selectedLead.stage_name || "Без стадии"}</span>
                      <Badge variant="secondary">{formatMoney(selectedLead.amount ?? selectedLead.products_total)}</Badge>
                    </SheetDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "chat" as const, label: "Чат", icon: MessageSquare },
                      { key: "info" as const, label: "Инфо", icon: Building2 },
                      { key: "history" as const, label: "История", icon: History },
                    ].map((tab) => {
                      const Icon = tab.icon
                      return (
                        <Button key={tab.key} variant={selectedLeadTab === tab.key ? "default" : "outline"} size="sm" onClick={() => setSelectedLeadTab(tab.key)}>
                          <Icon className="mr-2 size-4" />
                          {tab.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                {selectedLeadTab === "chat" && (
                  <div className="flex h-[calc(100vh-260px)] flex-col gap-4">
                    <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-background p-4">
                      {selectedLeadMessages.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Пока нет сообщений
                        </div>
                      ) : selectedLeadMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                            <div>{message.content}</div>
                            <div className="mt-1 text-[11px] opacity-70">{message.created_at || ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border bg-card p-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Написать сообщение..."
                          value={leadMessageDraft}
                          onChange={(e) => setLeadMessageDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              void handleSendLeadMessage()
                            }
                          }}
                        />
                        <Button onClick={() => void handleSendLeadMessage()} disabled={leadMessageSending}>
                          {leadMessageSending ? "..." : "Отправить"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLeadTab === "history" && (
                  <div className="space-y-3">
                    {selectedLeadHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        История изменений пока пуста
                      </div>
                    ) : (
                      selectedLeadHistory.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{entry.reason || "Изменение лида"}</div>
                            <div className="text-xs text-muted-foreground">{entry.created_at || "—"}</div>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">Изменения сохранены автоматически.</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {selectedLeadTab === "info" && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Название</label>
                        <Input value={selectedLead.title} onChange={(e) => setSelectedLead({ ...selectedLead, title: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Описание</label>
                        <Textarea value={selectedLead.description || ""} onChange={(e) => setSelectedLead({ ...selectedLead, description: e.target.value })} rows={4} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">Стадия</label>
                          <Select value={selectedLead.stage_id || EMPTY_VALUE} onValueChange={(value) => setSelectedLead({ ...selectedLead, stage_id: value === EMPTY_VALUE ? null : value })}>
                            <SelectTrigger><SelectValue placeholder="Выберите стадию" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_VALUE}>Без стадии</SelectItem>
                              {stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">Ответственный</label>
                          <Select value={selectedLead.responsible_user_id || EMPTY_VALUE} onValueChange={(value) => setSelectedLead({ ...selectedLead, responsible_user_id: value === EMPTY_VALUE ? null : value })}>
                            <SelectTrigger><SelectValue placeholder="Выберите пользователя" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_VALUE}>Без ответственного</SelectItem>
                              {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.last_name} {member.first_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Сумма: {formatMoney(selectedLead.amount ?? selectedLead.products_total)}</Badge>
                        <span className="text-sm text-muted-foreground">Цена считается из товаров лида</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="font-semibold">Контакты лида</div>
                        <Button size="sm" variant="outline" onClick={() => setCreateContactOpen(true)}>Создать контакт</Button>
                      </div>
                      <div className="space-y-2">
                        {selectedLead.contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                            <button type="button" className="text-left font-medium hover:underline" onClick={() => openContactEditor(contact)}>
                              {contactDisplayName(contact)}
                            </button>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedLead({ ...selectedLead, contacts: selectedLead.contacts.filter((item) => item.id !== contact.id) })}>
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="Поиск контактов..." className="pl-9" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                        </div>
                        <Select value="" onValueChange={(value) => {
                          const contact = filteredContacts.find((item) => item.id === value)
                          if (!contact) return
                          if (!selectedLead.contacts.some((item) => item.id === contact.id)) {
                            setSelectedLead({ ...selectedLead, contacts: [...selectedLead.contacts, contact] })
                          }
                        }}>
                          <SelectTrigger><SelectValue placeholder="Добавить контакт из CRM" /></SelectTrigger>
                          <SelectContent>
                            {filteredContacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactDisplayName(contact)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="font-semibold">Товары лида</div>
                        <Button size="sm" variant="outline" onClick={() => setCreateProductOpen(true)}>Создать товар</Button>
                      </div>
                      <div className="space-y-2">
                        {selectedLead.products.map((item) => (
                        <div key={item.id} className="rounded-xl border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{item.product_name || "Товар"}</span>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedLead({ ...selectedLead, products: selectedLead.products.filter((product) => product.id !== item.id) })}>
                              <X className="size-4" />
                            </Button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Количество</span>
                              <Input value={item.quantity} onChange={(e) => setSelectedLead({
                                ...selectedLead,
                                products: selectedLead.products.map((product) => product.id === item.id ? { ...product, quantity: Number(e.target.value || 1) } : product),
                              })} />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Цена</span>
                              <Input value={item.price ?? ""} onChange={(e) => setSelectedLead({
                                ...selectedLead,
                                products: selectedLead.products.map((product) => product.id === item.id ? { ...product, price: Number(e.target.value || 0) } : product),
                              })} />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Скидка</span>
                              <Input value={item.discount_value ?? ""} onChange={(e) => setSelectedLead({
                                ...selectedLead,
                                products: selectedLead.products.map((product) => product.id === item.id ? { ...product, discount_value: Number(e.target.value || 0) } : product),
                              })} />
                            </label>
                          </div>
                        </div>
                      ))}
                        <Select value="" onValueChange={(value) => {
                          const product = products.find((item) => item.id === value)
                          if (!product) return
                          if (!selectedLead.products.some((item) => item.product_id === product.id)) {
                            setSelectedLead({
                              ...selectedLead,
                              products: [...selectedLead.products, { id: `${product.id}-${Date.now()}`, product_id: product.id, product_name: product.name, quantity: 1, price: product.price, discount_type: null, discount_value: null }],
                            })
                          }
                        }}>
                          <SelectTrigger><SelectValue placeholder="Добавить товар из CRM" /></SelectTrigger>
                          <SelectContent>
                            {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="font-semibold">Документы лида</div>
                        <Button size="sm" variant="outline" onClick={() => {
                          setDocumentUploadLeadId(selectedLead.id)
                          setCreateDocumentOpen(true)
                        }}>Загрузить файлы</Button>
                      </div>
                      <div className="space-y-2">
                        {selectedLeadDocuments.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Документов пока нет</div>
                        ) : selectedLeadDocuments.map((document) => (
                          <div key={document.id} className="rounded-xl border p-3 text-sm">
                            <div className="font-medium">{document.file_name || document.title}</div>
                            <div className="text-xs text-muted-foreground">{document.mime_type || "Файл"} • {formatFileSize(document.size_bytes)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="font-semibold">Финоперации лида</div>
                        <Button size="sm" variant="outline" onClick={() => {
                          setFinanceForm((prev) => ({ ...prev, lead_id: selectedLead.id }))
                          setCreateFinanceOpen(true)
                        }}>Добавить операцию</Button>
                      </div>
                      <div className="space-y-2">
                        {selectedLeadFinances.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Финопераций пока нет</div>
                        ) : selectedLeadFinances.map((finance) => (
                          <div key={finance.id} className="rounded-xl border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{finance.category || "Без категории"}</span>
                              <span>{formatMoney(finance.amount)}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{finance.from_contact_name || "—"} → {finance.to_contact_name || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t p-4">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="destructive" onClick={async () => {
                    await deleteLead(activeCrm.id, selectedLead.id)
                    setSelectedLead(null)
                    await refreshDetail()
                  }}>Удалить</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedLead(null)}>Закрыть</Button>
                    <Button onClick={async () => {
                      if (!crmId || !selectedLead) return
                      await updateLead(crmId, selectedLead.id, {
                        title: selectedLead.title,
                        description: selectedLead.description,
                        stage_id: selectedLead.stage_id,
                        responsible_user_id: selectedLead.responsible_user_id,
                        amount: selectedLead.amount,
                        discount_type: selectedLead.discount_type,
                        discount_value: selectedLead.discount_value,
                        contact_ids: JSON.stringify(selectedLead.contacts.map((contact) => contact.id)),
                        product_items: JSON.stringify(selectedLead.products.map((item) => ({
                          product_id: item.product_id,
                          quantity: item.quantity,
                          price: item.price,
                          discount_type: item.discount_type,
                          discount_value: item.discount_value,
                        }))),
                      })
                      await refreshDetail()
                    }}>
                      Сохранить
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={stageEditorOpen} onOpenChange={setStageEditorOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Редактировать колонки</DialogTitle>
            <DialogDescription>Можно добавить новые стадии, переименовать существующие или удалить лишние.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
            {stageDrafts.map((stage, index) => (
              <div key={stage.id || `new-${index}`} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_140px_auto] md:items-end">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Название стадии</label>
                  <Input
                    value={stage.name}
                    onChange={(e) => setStageDrafts((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))}
                    placeholder="Название стадии"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Порядок</label>
                  <Input
                    inputMode="numeric"
                    value={stage.sort_order}
                    onChange={(e) => setStageDrafts((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, sort_order: Number(e.target.value || 0) } : item))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStageDrafts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="mr-2 size-4" />
                  Удалить
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setStageDrafts((prev) => [...prev, { name: "", sort_order: prev.length }])}
            >
              <Plus className="mr-2 size-4" />
              Добавить колонку
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageEditorOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleSaveStages()} disabled={stageEditorSaving}>
              {stageEditorSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productEditOpen} onOpenChange={setProductEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Редактировать товар</DialogTitle>
            <DialogDescription>Название, цена, себестоимость и описание редактируются здесь.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Input placeholder="Название" value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input
              placeholder="Цена"
              inputMode="decimal"
              value={productForm.price}
              onChange={(e) => setProductForm((prev) => ({ ...prev, price: normalizeDecimalInput(e.target.value) }))}
            />
            <Input
              placeholder="Себестоимость"
              inputMode="decimal"
              value={productForm.cost_price}
              onChange={(e) => setProductForm((prev) => ({ ...prev, cost_price: normalizeDecimalInput(e.target.value) }))}
            />
            <Textarea placeholder="Описание" rows={4} value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <DialogFooter className="justify-between">
            <Button
              variant="destructive"
              onClick={async () => {
                if (!crmId || !productEditId) return
                await deleteProduct(crmId, productEditId)
                setProductEditOpen(false)
                await refreshDetail()
              }}
            >
              Удалить
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setProductEditOpen(false)}>Отмена</Button>
              <Button onClick={() => void handleUpdateProduct()} disabled={productEditLoading}>
                {productEditLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={financeEditOpen} onOpenChange={setFinanceEditOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Редактировать финансовую операцию</DialogTitle>
            <DialogDescription>Можно поменять категорию, сумму, лид и контакты.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input placeholder="Категория" value={financeForm.category} onChange={(e) => setFinanceForm((prev) => ({ ...prev, category: e.target.value }))} />
            <Input type="date" placeholder="Дата" value={financeForm.date} onChange={(e) => setFinanceForm((prev) => ({ ...prev, date: e.target.value }))} />
            <Input placeholder="Сумма" inputMode="decimal" value={financeForm.amount} onChange={(e) => setFinanceForm((prev) => ({ ...prev, amount: normalizeDecimalInput(e.target.value) }))} />
            <Select value={financeForm.lead_id || EMPTY_VALUE} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, lead_id: value === EMPTY_VALUE ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Лид" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Без лида</SelectItem>
                {leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={financeForm.from_contact_id || EMPTY_VALUE} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, from_contact_id: value === EMPTY_VALUE ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="От кого" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Без контакта</SelectItem>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactDisplayName(contact)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={financeForm.to_contact_id || EMPTY_VALUE} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, to_contact_id: value === EMPTY_VALUE ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Кому" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Без контакта</SelectItem>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactDisplayName(contact)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Комментарий" className="md:col-span-2" rows={4} value={financeForm.note} onChange={(e) => setFinanceForm((prev) => ({ ...prev, note: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinanceEditOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleUpdateFinance()} disabled={financeEditLoading}>
              {financeEditLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactEditOpen} onOpenChange={setContactEditOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Редактировать контакт</DialogTitle>
            <DialogDescription>Каждое поле отдельно. Кнопка слева копирует значение.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {contactEditForm.type === "person" ? (
              <>
                {[
                  ["Фамилия", "last_name"],
                  ["Имя", "first_name"],
                  ["Отчество", "patronymic"],
                  ["Email", "email"],
                  ["Телефон", "phone"],
                  ["Адрес", "address"],
                  ["Должность", "position"],
                ].map(([label, field]) => (
                  <div key={field} className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyText((contactEditForm as Record<string, string>)[field] || "")}>
                      <Copy className="size-4" />
                    </Button>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-sm font-medium">{label}</label>
                      <Input
                        value={(contactEditForm as Record<string, string>)[field] || ""}
                        onChange={(e) => setContactEditForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  ["Полное наименование", "company_name_full"],
                  ["Краткое наименование", "company_name_short"],
                  ["ИНН", "inn"],
                  ["КПП", "kpp"],
                  ["ОГРН", "ogrn"],
                  ["Email", "email"],
                  ["Телефон", "phone"],
                  ["Адрес", "address"],
                ].map(([label, field]) => (
                  <div key={field} className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyText((contactEditForm as Record<string, string>)[field] || "")}>
                      <Copy className="size-4" />
                    </Button>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-sm font-medium">{label}</label>
                      <Input
                        value={(contactEditForm as Record<string, string>)[field] || ""}
                        onChange={(e) => setContactEditForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactEditOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleSaveContactEdit()} disabled={contactEditLoading}>
              {contactEditLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createLeadOpen} onOpenChange={setCreateLeadOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Создать лид</DialogTitle>
            <DialogDescription>Лид попадёт в выбранную стадию CRM.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium">Название</label>
              <Input value={leadForm.title} onChange={(e) => setLeadForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium">Описание</label>
              <Textarea rows={4} value={leadForm.description} onChange={(e) => setLeadForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Стадия</label>
              <Select value={leadForm.stage_id || EMPTY_VALUE} onValueChange={(value) => setLeadForm((prev) => ({ ...prev, stage_id: value === EMPTY_VALUE ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Выберите стадию" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Без стадии</SelectItem>
                  {stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ответственный</label>
              <Select value={leadForm.responsible_user_id || EMPTY_VALUE} onValueChange={(value) => setLeadForm((prev) => ({ ...prev, responsible_user_id: value === EMPTY_VALUE ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Пользователь" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Без ответственного</SelectItem>
                  {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.last_name} {member.first_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateLeadOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateLead()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createContactOpen} onOpenChange={setCreateContactOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Создать контакт</DialogTitle>
            <DialogDescription>Физическое лицо или организация.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium">Тип</label>
              <Select value={contactForm.type} onValueChange={(value) => setContactForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Физическое лицо</SelectItem>
                  <SelectItem value="company">Организация</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contactForm.type === "person" ? (
              <>
                <Input placeholder="Фамилия" value={contactForm.last_name} onChange={(e) => setContactForm((prev) => ({ ...prev, last_name: e.target.value }))} />
                <Input placeholder="Имя" value={contactForm.first_name} onChange={(e) => setContactForm((prev) => ({ ...prev, first_name: e.target.value }))} />
                <Input placeholder="Отчество" value={contactForm.patronymic} onChange={(e) => setContactForm((prev) => ({ ...prev, patronymic: e.target.value }))} />
                <Input placeholder="Должность" value={contactForm.position} onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))} />
              </>
            ) : (
              <>
                <Input placeholder="Полное наименование" value={contactForm.company_name_full} onChange={(e) => setContactForm((prev) => ({ ...prev, company_name_full: e.target.value }))} />
                <Input placeholder="Краткое наименование" value={contactForm.company_name_short} onChange={(e) => setContactForm((prev) => ({ ...prev, company_name_short: e.target.value }))} />
                <div className="flex gap-2 md:col-span-2">
                  <Input placeholder="ИНН" value={contactForm.inn} onChange={(e) => setContactForm((prev) => ({ ...prev, inn: e.target.value }))} />
                  <Button variant="outline" onClick={() => void handleContactLookup()} disabled={contactLookupLoading}>
                    {contactLookupLoading ? <Loader2 className="size-4 animate-spin" /> : "Найти"}
                  </Button>
                </div>
                <Input placeholder="КПП" value={contactForm.kpp} onChange={(e) => setContactForm((prev) => ({ ...prev, kpp: e.target.value }))} />
                <Input placeholder="ОГРН" value={contactForm.ogrn} onChange={(e) => setContactForm((prev) => ({ ...prev, ogrn: e.target.value }))} />
              </>
            )}
            <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))} />
            <Input placeholder="Телефон" value={contactForm.phone} onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input placeholder="Адрес" className="md:col-span-2" value={contactForm.address} onChange={(e) => setContactForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateContactOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateContact()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
          <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Создать товар</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <Input placeholder="Название" value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input
              placeholder="Цена"
              inputMode="decimal"
              value={productForm.price}
              onChange={(e) => setProductForm((prev) => ({ ...prev, price: normalizeDecimalInput(e.target.value) }))}
            />
            <Input
              placeholder="Себестоимость"
              inputMode="decimal"
              value={productForm.cost_price}
              onChange={(e) => setProductForm((prev) => ({ ...prev, cost_price: normalizeDecimalInput(e.target.value) }))}
            />
            <Textarea placeholder="Описание" rows={4} value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProductOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateProduct()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Создать категорию документов</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input placeholder="Название категории" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateCategory()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDocumentOpen}
        onOpenChange={(open) => {
          setCreateDocumentOpen(open)
          if (!open) {
            setDocumentUploadCategoryId("")
            setDocumentUploadFiles([])
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Загрузить файлы</DialogTitle>
            <DialogDescription>Выберите категорию и добавьте файлы. Имена и типы сохранятся автоматически.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Select value={documentUploadCategoryId || EMPTY_VALUE} onValueChange={(value) => setDocumentUploadCategoryId(value === EMPTY_VALUE ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Без категории</SelectItem>
                {documentCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="file"
              multiple
              onChange={(e) => setDocumentUploadFiles(Array.from(e.target.files || []))}
            />
            <div className="space-y-2">
              {documentUploadFiles.length > 0 ? documentUploadFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span className="truncate">{file.name}</span>
                  <span className="ml-3 shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Файлы ещё не выбраны
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDocumentOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleUploadDocuments()} disabled={documentUploadLoading || documentUploadFiles.length === 0}>
              {documentUploadLoading ? "Загрузка..." : "Загрузить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFinanceOpen} onOpenChange={setCreateFinanceOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader><DialogTitle>Создать финансовую операцию</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input placeholder="Категория" value={financeForm.category} onChange={(e) => setFinanceForm((prev) => ({ ...prev, category: e.target.value }))} />
            <Input type="date" placeholder="Дата" value={financeForm.date} onChange={(e) => setFinanceForm((prev) => ({ ...prev, date: e.target.value }))} />
            <Input placeholder="Сумма" value={financeForm.amount} onChange={(e) => setFinanceForm((prev) => ({ ...prev, amount: e.target.value }))} />
            <Select value={financeForm.lead_id || EMPTY_VALUE} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, lead_id: value === EMPTY_VALUE ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Лид" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Без лида</SelectItem>
                {leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={financeForm.from_contact_id} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, from_contact_id: value }))}>
              <SelectTrigger><SelectValue placeholder="От кого" /></SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactDisplayName(contact)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={financeForm.to_contact_id} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, to_contact_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Кому" /></SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactDisplayName(contact)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Комментарий" className="md:col-span-2" rows={4} value={financeForm.note} onChange={(e) => setFinanceForm((prev) => ({ ...prev, note: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFinanceOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateFinance()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
