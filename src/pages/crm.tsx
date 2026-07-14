import { useEffect, useMemo, useState, type ComponentType } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronRight,
  FileText,
  Layers3,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Users,
  Wallet,
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
    createContact,
    lookupOrganization,
    createProduct,
    createCategory,
    createDocument,
    createFinance,
  } = useCrm(teamLogin)

  const [activeTab, setActiveTab] = useState<CrmTab>("leads")
  const [search, setSearch] = useState("")
  const [selectedCrm, setSelectedCrm] = useState<CrmDetail | null>(null)
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)

  const [createCrmOpen, setCreateCrmOpen] = useState(false)
  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const [createProductOpen, setCreateProductOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false)
  const [createFinanceOpen, setCreateFinanceOpen] = useState(false)

  const [newCrmName, setNewCrmName] = useState("")
  const [newCrmDescription, setNewCrmDescription] = useState("")

  const [leadForm, setLeadForm] = useState({ title: "", description: "", stage_id: "", responsible_user_id: "", amount: "" })
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

  const [productForm, setProductForm] = useState({ name: "", price: "", description: "" })
  const [categoryName, setCategoryName] = useState("")
  const [documentForm, setDocumentForm] = useState({ title: "", category_id: "", content_text: "", file_name: "", mime_type: "", size_bytes: "" })
  const [financeForm, setFinanceForm] = useState({ category: "", date: "", amount: "", from_contact_id: "", to_contact_id: "", note: "" })

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

  const activeCrm = selectedCrm || null

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

  const handleCreateLead = async () => {
    if (!crmId || !leadForm.title.trim()) return
    const lead = await createLead(crmId, {
      title: leadForm.title.trim(),
      description: leadForm.description.trim(),
      stage_id: leadForm.stage_id || undefined,
      responsible_user_id: leadForm.responsible_user_id || undefined,
      amount: leadForm.amount || undefined,
      contact_ids: JSON.stringify(leadContacts),
      product_items: JSON.stringify(leadProducts),
    })
    if (lead) {
      setCreateLeadOpen(false)
      setLeadForm({ title: "", description: "", stage_id: stages[0]?.id || "", responsible_user_id: "", amount: "" })
      setLeadContacts([])
      setLeadProducts([])
      await refreshDetail()
    }
  }

  const handleContactLookup = async () => {
    if (!contactForm.inn.trim()) return
    setContactLookupLoading(true)
    const data = await lookupOrganization(contactForm.inn.trim())
    if (data?.data) {
      const suggestion = data.data as { data?: Record<string, any>; unrestricted_value?: string; value?: string }
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
    const product = await createProduct(crmId, { name: productForm.name.trim(), price: productForm.price || undefined, description: productForm.description.trim() })
    if (product) {
      setCreateProductOpen(false)
      setProductForm({ name: "", price: "", description: "" })
      await refreshDetail()
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

  const handleCreateDocument = async () => {
    if (!crmId || !documentForm.title.trim()) return
    const doc = await createDocument(crmId, {
      title: documentForm.title.trim(),
      category_id: documentForm.category_id || undefined,
      content_text: documentForm.content_text.trim() || undefined,
      file_name: documentForm.file_name.trim() || undefined,
      mime_type: documentForm.mime_type.trim() || undefined,
      size_bytes: documentForm.size_bytes || undefined,
    })
    if (doc) {
      setCreateDocumentOpen(false)
      setDocumentForm({ title: "", category_id: "", content_text: "", file_name: "", mime_type: "", size_bytes: "" })
      await refreshDetail()
    }
  }

  const handleCreateFinance = async () => {
    if (!crmId || !financeForm.amount.trim()) return
    const finance = await createFinance(crmId, financeForm)
    if (finance) {
      setCreateFinanceOpen(false)
      setFinanceForm({ category: "", date: "", amount: "", from_contact_id: "", to_contact_id: "", note: "" })
      await refreshDetail()
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
          <Button variant="outline" onClick={() => navigate(`/teams/${teamLogin}/crm`)}>
            <ArrowLeft className="mr-2 size-4" />
            К CRM
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
            return (
              <div key={stage.id} className="flex min-w-[320px] max-w-[320px] flex-col rounded-2xl border bg-muted/20">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <div className="font-semibold">{stage.name}</div>
                    <div className="text-xs text-muted-foreground">{stageLeads.length} лидов</div>
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
            <Button onClick={() => setCreateContactOpen(true)}><Plus className="mr-2 size-4" />Добавить контакт</Button>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border p-4">
                <div className="font-semibold">
                  {contact.type === "company"
                    ? contact.company_name_short || contact.company_name_full || "Организация"
                    : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {contact.type === "company" ? contact.company_name_full : [contact.position, contact.email, contact.phone].filter(Boolean).join(" • ")}
                </div>
              </div>
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
              <div key={product.id} className="rounded-2xl border p-4">
                <div className="font-semibold">{product.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{product.description || "Без описания"}</div>
                <div className="mt-3 text-sm font-medium">{formatMoney(product.price)}</div>
              </div>
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
              <Button onClick={() => setCreateDocumentOpen(true)}><Plus className="mr-2 size-4" />Документ</Button>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {documentCategories.map((category) => (
              <div key={category.id} className="rounded-2xl border p-4">
                <div className="font-semibold">{category.name}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {documents.filter((document) => document.category_id === category.id).length} документов
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
            <Button onClick={() => setCreateFinanceOpen(true)}><Plus className="mr-2 size-4" />Добавить операцию</Button>
          </div>
          <div className="divide-y">
            {finances.map((finance) => (
              <div key={finance.id} className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{finance.category || "Без категории"}</div>
                  <div className="text-sm text-muted-foreground">{finance.from_contact_name || "—"} → {finance.to_contact_name || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatMoney(finance.amount)}</div>
                  <div className="text-xs text-muted-foreground">{finance.date || "—"}</div>
                </div>
              </div>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <SheetTitle>{selectedLead.title}</SheetTitle>
                    <SheetDescription>{selectedLead.stage_name || "Без стадии"}</SheetDescription>
                  </div>
                  <Button variant="destructive" onClick={async () => {
                    await deleteLead(activeCrm.id, selectedLead.id)
                    setSelectedLead(null)
                    await refreshDetail()
                  }}>Удалить</Button>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-medium">Название</label>
                    <Input value={selectedLead.title} onChange={(e) => setSelectedLead({ ...selectedLead, title: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-medium">Описание</label>
                    <Textarea value={selectedLead.description || ""} onChange={(e) => setSelectedLead({ ...selectedLead, description: e.target.value })} rows={4} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Стадия</label>
                    <Select value={selectedLead.stage_id || ""} onValueChange={(value) => setSelectedLead({ ...selectedLead, stage_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите стадию" /></SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Ответственный</label>
                    <Select value={selectedLead.responsible_user_id || ""} onValueChange={(value) => setSelectedLead({ ...selectedLead, responsible_user_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите пользователя" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Без ответственного</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.last_name} {member.first_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Сумма</label>
                    <Input value={selectedLead.amount ?? ""} onChange={(e) => setSelectedLead({ ...selectedLead, amount: Number(e.target.value || 0) })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Скидка</label>
                    <div className="flex gap-2">
                      <Input className="w-32" placeholder="Тип" value={selectedLead.discount_type || ""} onChange={(e) => setSelectedLead({ ...selectedLead, discount_type: e.target.value })} />
                      <Input placeholder="Значение" value={selectedLead.discount_value ?? ""} onChange={(e) => setSelectedLead({ ...selectedLead, discount_value: Number(e.target.value || 0) })} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-semibold">Контакты лида</div>
                      <Button size="sm" variant="outline" onClick={() => setCreateContactOpen(true)}>Создать контакт</Button>
                    </div>
                    <div className="space-y-2">
                      {selectedLead.contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                          <span>{contact.type === "company" ? contact.company_name_short || contact.company_name_full || "Контакт" : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}</span>
                          <Button size="icon" variant="ghost" onClick={() => setSelectedLead({ ...selectedLead, contacts: selectedLead.contacts.filter((item) => item.id !== contact.id) })}><X className="size-4" /></Button>
                        </div>
                      ))}
                      <Select value="" onValueChange={(value) => {
                        const contact = contacts.find((item) => item.id === value)
                        if (!contact) return
                        if (!selectedLead.contacts.some((item) => item.id === contact.id)) {
                          setSelectedLead({ ...selectedLead, contacts: [...selectedLead.contacts, contact] })
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Добавить контакт из CRM" /></SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.type === "company" ? contact.company_name_short || contact.company_name_full || "Контакт" : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-semibold">Товары лида</div>
                      <Button size="sm" variant="outline" onClick={() => setCreateProductOpen(true)}>Создать товар</Button>
                    </div>
                    <div className="space-y-2">
                      {selectedLead.products.map((item) => (
                        <div key={item.id} className="rounded-xl border p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span>{item.product_name || "Товар"}</span>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedLead({ ...selectedLead, products: selectedLead.products.filter((product) => product.id !== item.id) })}><X className="size-4" /></Button>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <Input value={item.quantity} onChange={(e) => setSelectedLead({
                              ...selectedLead,
                              products: selectedLead.products.map((product) => product.id === item.id ? { ...product, quantity: Number(e.target.value || 1) } : product),
                            })} />
                            <Input value={item.price ?? ""} onChange={(e) => setSelectedLead({
                              ...selectedLead,
                              products: selectedLead.products.map((product) => product.id === item.id ? { ...product, price: Number(e.target.value || 0) } : product),
                            })} />
                            <Input value={item.discount_value ?? ""} onChange={(e) => setSelectedLead({
                              ...selectedLead,
                              products: selectedLead.products.map((product) => product.id === item.id ? { ...product, discount_value: Number(e.target.value || 0) } : product),
                            })} />
                          </div>
                        </div>
                      ))}
                      <Select value="" onValueChange={(value) => {
                        const product = products.find((item) => item.id === value)
                        if (!product) return
                        if (!selectedLead.products.some((item) => item.product_id === product.id)) {
                          setSelectedLead({
                            ...selectedLead,
                            products: [
                              ...selectedLead.products,
                              { id: `${product.id}-${Date.now()}`, product_id: product.id, product_name: product.name, quantity: 1, price: product.price, discount_type: null, discount_value: null },
                            ],
                          })
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Добавить товар из CRM" /></SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t p-4">
                <div className="flex justify-end gap-2">
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
          )}
        </SheetContent>
      </Sheet>

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
              <Select value={leadForm.stage_id} onValueChange={(value) => setLeadForm((prev) => ({ ...prev, stage_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Выберите стадию" /></SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ответственный</label>
              <Select value={leadForm.responsible_user_id} onValueChange={(value) => setLeadForm((prev) => ({ ...prev, responsible_user_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Пользователь" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без ответственного</SelectItem>
                  {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.last_name} {member.first_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Сумма</label>
              <Input value={leadForm.amount} onChange={(e) => setLeadForm((prev) => ({ ...prev, amount: e.target.value }))} />
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
            <Input placeholder="Цена" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} />
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

      <Dialog open={createDocumentOpen} onOpenChange={setCreateDocumentOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader><DialogTitle>Создать документ</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input placeholder="Название" className="md:col-span-2" value={documentForm.title} onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))} />
            <Select value={documentForm.category_id} onValueChange={(value) => setDocumentForm((prev) => ({ ...prev, category_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                {documentCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Имя файла" value={documentForm.file_name} onChange={(e) => setDocumentForm((prev) => ({ ...prev, file_name: e.target.value }))} />
            <Textarea placeholder="Текст документа" className="md:col-span-2" rows={4} value={documentForm.content_text} onChange={(e) => setDocumentForm((prev) => ({ ...prev, content_text: e.target.value }))} />
            <Input placeholder="Mime type" value={documentForm.mime_type} onChange={(e) => setDocumentForm((prev) => ({ ...prev, mime_type: e.target.value }))} />
            <Input placeholder="Размер байт" value={documentForm.size_bytes} onChange={(e) => setDocumentForm((prev) => ({ ...prev, size_bytes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDocumentOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleCreateDocument()}>Создать</Button>
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
            <Select value={financeForm.from_contact_id} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, from_contact_id: value }))}>
              <SelectTrigger><SelectValue placeholder="От кого" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не выбрано</SelectItem>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.type === "company" ? contact.company_name_short || contact.company_name_full || "Контакт" : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={financeForm.to_contact_id} onValueChange={(value) => setFinanceForm((prev) => ({ ...prev, to_contact_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Кому" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не выбрано</SelectItem>
                {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.type === "company" ? contact.company_name_short || contact.company_name_full || "Контакт" : `${contact.last_name || ""} ${contact.first_name || ""}`.trim() || "Контакт"}</SelectItem>)}
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
