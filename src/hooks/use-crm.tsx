import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"

function toFormBody(payload: Record<string, string | number | boolean | undefined | null>) {
  const form = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

export interface CrmStage {
  id: string
  crm_id: string
  name: string
  sort_order: number
}

export interface CrmContact {
  id: string
  crm_id: string
  type: "person" | "company"
  first_name: string | null
  last_name: string | null
  patronymic: string | null
  email: string | null
  phone: string | null
  address: string | null
  position: string | null
  company_name_full: string | null
  company_name_short: string | null
  inn: string | null
  kpp: string | null
  ogrn: string | null
  raw_json: unknown
  created_at: string | null
  updated_at: string | null
}

export interface CrmProduct {
  id: string
  crm_id: string
  name: string
  price: number | null
  cost_price: number | null
  description: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CrmLeadProduct {
  id: string
  product_id: string
  product_name: string | null
  quantity: number
  price: number | null
  discount_type: string | null
  discount_value: number | null
}

export interface CrmLead {
  id: string
  crm_id: string
  stage_id: string | null
  stage_name: string | null
  title: string
  description: string | null
  responsible_user_id: string | null
  responsible_name: string | null
  responsible_img_url: string | null
  amount: number | null
  discount_type: string | null
  discount_value: number | null
  contacts: CrmContact[]
  products: CrmLeadProduct[]
  products_total: number
  closed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CrmDocumentCategory {
  id: string
  crm_id: string
  name: string
  sort_order: number
}

export interface CrmDocument {
  id: string
  crm_id: string
  category_id: string | null
  category_name: string | null
  lead_id: string | null
  title: string
  content_text: string | null
  storage_file_id: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number
  created_at: string | null
  updated_at: string | null
}

export interface CrmFinance {
  id: string
  crm_id: string
  lead_id: string | null
  category: string | null
  date: string | null
  amount: number
  from_contact_id: string | null
  to_contact_id: string | null
  from_contact_name: string | null
  to_contact_name: string | null
  note: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CrmDetail {
  id: string
  team_id: string
  created_by: string | null
  name: string
  description: string | null
  img_url: string | null
  is_deleted: boolean
  stages_count: number
  leads_count: number
  contacts_count: number
  products_count: number
  documents_count: number
  finances_count: number
  created_at: string | null
  updated_at: string | null
  stages: CrmStage[]
  leads: CrmLead[]
  contacts: CrmContact[]
  products: CrmProduct[]
  document_categories: CrmDocumentCategory[]
  documents: CrmDocument[]
  finances: CrmFinance[]
  stats: {
    stages: number
    leads: number
    contacts: number
    products: number
    documents: number
    finances: number
    lead_amount: number
    finance_amount: number
  }
}

export interface CrmSummary {
  id: string
  team_id: string
  created_by: string | null
  name: string
  description: string | null
  img_url: string | null
  is_deleted: boolean
  stages_count: number
  leads_count: number
  contacts_count: number
  products_count: number
  documents_count: number
  finances_count: number
  created_at: string | null
  updated_at: string | null
}

export function useCrm(teamLogin?: string) {
  const [crms, setCrms] = useState<CrmSummary[]>([])
  const [loading, setLoading] = useState(true)

  const refreshCrms = useCallback(async () => {
    if (!teamLogin) {
      setCrms([])
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get(`/main/crm/list/?team_login=${teamLogin}`)
      if (data.status && Array.isArray(data.data)) {
        setCrms(data.data as CrmSummary[])
      } else {
        setCrms([])
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error("Failed to fetch CRM list:", error)
      }
      setCrms([])
    } finally {
      setLoading(false)
    }
  }, [teamLogin])

  useEffect(() => {
    void refreshCrms()
  }, [refreshCrms])

  const getCrm = useCallback(async (crmId: string): Promise<CrmDetail | null> => {
    if (!teamLogin || !crmId) return null
    try {
      const { data } = await api.get(`/main/crm/get/?team_login=${teamLogin}&crm_id=${crmId}`)
      if (data.status && data.data) {
        return data.data as CrmDetail
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error("Failed to fetch CRM detail:", error)
      }
    }
    return null
  }, [teamLogin])

  const createCrm = useCallback(async (payload: { name: string; description?: string }) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/create/?team_login=${teamLogin}`,
      toFormBody(payload),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    if (data.status && data.data) {
      const crm = data.data as CrmSummary
      setCrms((prev) => [crm, ...prev.filter((item) => item.id !== crm.id)])
      return crm
    }
    return null
  }, [teamLogin])

  const updateCrm = useCallback(async (crmId: string, payload: { name?: string; description?: string; img_url?: string | null }) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/update/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    if (data.status && data.data) {
      return data.data as CrmSummary
    }
    return null
  }, [teamLogin])

  const deleteCrm = useCallback(async (crmId: string) => {
    if (!teamLogin) return false
    const { data } = await api.post(
      `/main/crm/delete/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    if (data.status) {
      setCrms((prev) => prev.filter((item) => item.id !== crmId))
      return true
    }
    return false
  }, [teamLogin])

  const createLead = useCallback(async (crmId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createLead/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmLead) : null
  }, [teamLogin])

  const updateLead = useCallback(async (crmId: string, leadId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/updateLead/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, lead_id: leadId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmLead) : null
  }, [teamLogin])

  const moveLead = useCallback(async (crmId: string, leadId: string, stageId: string) => updateLead(crmId, leadId, { stage_id: stageId }), [updateLead])

  const deleteLead = useCallback(async (crmId: string, leadId: string) => {
    if (!teamLogin) return false
    const { data } = await api.post(
      `/main/crm/deleteLead/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, lead_id: leadId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status === true
  }, [teamLogin])

  const createContact = useCallback(async (crmId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createContact/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmContact) : null
  }, [teamLogin])

  const updateContact = useCallback(async (crmId: string, contactId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/updateContact/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, contact_id: contactId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmContact) : null
  }, [teamLogin])

  const deleteContact = useCallback(async (crmId: string, contactId: string) => {
    if (!teamLogin) return false
    const { data } = await api.post(
      `/main/crm/deleteContact/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, contact_id: contactId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status === true
  }, [teamLogin])

  const lookupOrganization = useCallback(async (query: string) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/lookupOrganization/?team_login=${teamLogin}`,
      toFormBody({ query }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? data.data : null
  }, [teamLogin])

  const createProduct = useCallback(async (crmId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createProduct/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmProduct) : null
  }, [teamLogin])

  const updateProduct = useCallback(async (crmId: string, productId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/updateProduct/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, product_id: productId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmProduct) : null
  }, [teamLogin])

  const deleteProduct = useCallback(async (crmId: string, productId: string) => {
    if (!teamLogin) return false
    const { data } = await api.post(
      `/main/crm/deleteProduct/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, product_id: productId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status === true
  }, [teamLogin])

  const uploadDocuments = useCallback(async (crmId: string, payload: { category_id?: string; files: File[] }) => {
    if (!teamLogin) return []

    const form = new FormData()
    form.append("crm_id", crmId)
    if (payload.category_id) {
      form.append("category_id", payload.category_id)
    }
    payload.files.forEach((file) => form.append("files[]", file))

    const { data } = await api.post(`/main/crm/uploadDocuments/?team_login=${teamLogin}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return data.status && Array.isArray(data.data) ? (data.data as CrmDocument[]) : []
  }, [teamLogin])

  const createCategory = useCallback(async (crmId: string, name: string) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createDocumentCategory/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, name }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmDocumentCategory) : null
  }, [teamLogin])

  const createDocument = useCallback(async (crmId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createDocument/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmDocument) : null
  }, [teamLogin])

  const createFinance = useCallback(async (crmId: string, payload: Record<string, unknown>) => {
    if (!teamLogin) return null
    const { data } = await api.post(
      `/main/crm/createFinance/?team_login=${teamLogin}`,
      toFormBody({ crm_id: crmId, ...payload }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.status ? (data.data as CrmFinance) : null
  }, [teamLogin])

  const getStats = useCallback(async (crmId: string) => {
    if (!teamLogin) return null
    const { data } = await api.get(`/main/crm/getStats/?team_login=${teamLogin}&crm_id=${crmId}`)
    return data.status ? data.data : null
  }, [teamLogin])

  return useMemo(() => ({
    crms,
    loading,
    refreshCrms,
    getCrm,
    createCrm,
    updateCrm,
    deleteCrm,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    createContact,
    updateContact,
    deleteContact,
    lookupOrganization,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadDocuments,
    createCategory,
    createDocument,
    createFinance,
    getStats,
  }), [
    crms,
    loading,
    refreshCrms,
    getCrm,
    createCrm,
    updateCrm,
    deleteCrm,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    createContact,
    updateContact,
    deleteContact,
    lookupOrganization,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadDocuments,
    createCategory,
    createDocument,
    createFinance,
    getStats,
  ])
}
