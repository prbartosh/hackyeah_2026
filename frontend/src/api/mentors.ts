// Kontrakt = backend/app/schemas/mentor.py (ADR 0014). Przy zmianach schematu poprawiaj ten plik.
import { call } from '@/admin/api'
import type { Sektor } from '@/api/partnerships'

export interface Mentor {
  id: number
  nazwa: string
  instytucja: string
  sektor: Sektor
  obszary: string[]
  powiat: string
  opis: string
  syntetyczny: boolean
}

export interface MentorAdmin extends Mentor {
  email: string
  aktywny: boolean
  created_at: string
}

export interface MentorInput {
  nazwa: string
  instytucja: string
  sektor: Sektor
  obszary: string[]
  powiat: string
  opis: string
  email: string
  aktywny: boolean
}

export interface TicketMentor {
  mentor_prosba: boolean
  mentor: MentorAdmin | null
}

export interface MentorMessage {
  autor_rola: 'uzytkownik' | 'admin' | 'mentor' | 'system'
  tresc: string
  created_at: string
}

export interface MentorThread {
  mentor_nazwa: string
  wiadomosci: MentorMessage[]
}

const send = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
})
const enc = encodeURIComponent

export const mentors = {
  list: (filters: { obszar?: string; powiat?: string }) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][])
    return call<Mentor[]>(`/mentorzy?${params}`, {}, false)
  },
  requestMentor: (threadToken: string) =>
    call<{ status: string }>(`/zgloszenia/watek/${enc(threadToken)}/mentor`, send('POST'), false),
  thread: (mentorToken: string, threadToken: string) =>
    call<MentorThread>(`/mentor/${enc(mentorToken)}/watek/${enc(threadToken)}`, {}, false),
  reply: (mentorToken: string, threadToken: string, tresc: string) =>
    call<MentorThread>(`/mentor/${enc(mentorToken)}/watek/${enc(threadToken)}`, send('POST', { tresc }), false),

  adminList: () => call<MentorAdmin[]>('/admin/mentorzy'),
  adminCreate: (data: MentorInput) => call<MentorAdmin>('/admin/mentorzy', send('POST', data)),
  adminUpdate: (id: number, data: Partial<MentorInput>) =>
    call<MentorAdmin>(`/admin/mentorzy/${id}`, send('PATCH', data)),
  ticketMentor: (ticketId: number) => call<TicketMentor>(`/admin/zgloszenia/${ticketId}/mentor`),
  assign: (ticketId: number, mentorId: number | null) =>
    call<TicketMentor>(`/admin/zgloszenia/${ticketId}/mentor`, send('PATCH', { mentor_id: mentorId })),
}
