import { http } from './http'

// Contactos de un cliente (/api/clients/:clientId/contacts, HU-04). Todos los
// roles leen (el asesor solo los de sus rutas); crear y editar es de admin y director.

export interface ApiContact {
  id: number
  clientId: number
  name: string
  jobTitle: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  isPrimary: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

/** Requiere al menos un medio de contacto: phone, mobile o email. */
export interface ContactPayload {
  name: string
  jobTitle?: string
  phone?: string
  mobile?: string
  email?: string
  isPrimary?: boolean
}

/** Mismo patrón tolerante del backend. */
export const PHONE_PATTERN = /^[0-9+()\s.-]{7,30}$/

export const listContacts = (clientId: number) => http<ApiContact[]>(`/clients/${clientId}/contacts`)

export const createContact = (clientId: number, payload: ContactPayload) =>
  http<ApiContact>(`/clients/${clientId}/contacts`, { method: 'POST', body: payload })

export const updateContact = (clientId: number, contactId: number, payload: Partial<ContactPayload>) =>
  http<ApiContact>(`/clients/${clientId}/contacts/${contactId}`, { method: 'PATCH', body: payload })

/** El contacto principal, o el primero activo si ninguno está marcado. */
/** Solo admin y director. Desactivar no borra el contacto ni su historial. */
export const setContactActive = (clientId: number, contactId: number, active: boolean) =>
  http<ApiContact>(`/clients/${clientId}/contacts/${contactId}/status`, { method: 'PATCH', body: { active } })

export const primaryContact = (contacts: ApiContact[]) =>
  contacts.find((c) => c.active && c.isPrimary) ?? contacts.find((c) => c.active) ?? null
