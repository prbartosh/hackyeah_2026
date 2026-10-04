import { Route, Routes } from 'react-router-dom'

import AdminLayout from '@/admin/AdminLayout'
import CardEditPage from '@/admin/CardEditPage'
import CardsPage from '@/admin/CardsPage'
import ImportReviewPage from '@/admin/ImportReviewPage'
import ImportsPage from '@/admin/ImportsPage'
import InboxPage from '@/admin/InboxPage'
import MentorsPage from '@/admin/MentorsPage'
import NotificationsPage from '@/admin/NotificationsPage'
import OpinionsPage from '@/admin/OpinionsPage'
import PartnershipsPage from '@/admin/PartnershipsPage'
import RadarPage from '@/admin/RadarPage'
import TicketPage from '@/admin/TicketPage'
import { NaborEditPage, NaboryPage } from '@/kreator/AdminNabory'
import NotFoundPage from '@/pages/NotFoundPage'

/** Cały panel w jednym chunku (ładowany leniwie z `App` pod `admin/*`). */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<InboxPage />} />
        <Route path="zgloszenia/:id" element={<TicketPage />} />
        <Route path="powiadomienia" element={<NotificationsPage />} />
        <Route path="importy" element={<ImportsPage />} />
        <Route path="importy/:id" element={<ImportReviewPage />} />
        <Route path="karty" element={<CardsPage />} />
        <Route path="karty/:slug" element={<CardEditPage />} />
        <Route path="radar" element={<RadarPage />} />
        <Route path="nabory" element={<NaboryPage />} />
        <Route path="nabory/:slug" element={<NaborEditPage />} />
        <Route path="opinie" element={<OpinionsPage />} />
        <Route path="partnerstwa" element={<PartnershipsPage />} />
        <Route path="mentorzy" element={<MentorsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
