import { Route, Routes } from 'react-router-dom'

import AdminLayout from '@/admin/AdminLayout'
import CardEditPage from '@/admin/CardEditPage'
import CardsPage from '@/admin/CardsPage'
import ImportReviewPage from '@/admin/ImportReviewPage'
import ImportsPage from '@/admin/ImportsPage'
import InboxPage from '@/admin/InboxPage'
import NotificationsPage from '@/admin/NotificationsPage'
import RadarPage from '@/admin/RadarPage'
import TicketPage from '@/admin/TicketPage'
import Layout from '@/components/Layout'
import { NaborEditPage, NaboryPage } from '@/kreator/AdminNabory'
import CanvaPage from '@/kreator/CanvaPage'
import FiszkaPage from '@/kreator/FiszkaPage'
import FinansowaniePage from '@/kreator/FinansowaniePage'
import KreatorHome from '@/kreator/KreatorHome'
import WniosekPage from '@/kreator/WniosekPage'
import DocumentPage from '@/pages/DocumentPage'
import HomePage from '@/pages/HomePage'
import InnovationPage from '@/pages/InnovationPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ReportPage from '@/pages/ReportPage'
import ThreadPage from '@/pages/ThreadPage'
import ZasobnikPage from '@/pages/ZasobnikPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="zasobnik" element={<ZasobnikPage />} />
        <Route path="innowacja/:slug" element={<InnovationPage />} />
        <Route path="dokument/:id" element={<DocumentPage />} />
        <Route path="zglos" element={<ReportPage />} />
        <Route path="watek/:token" element={<ThreadPage />} />
        <Route path="kreator" element={<KreatorHome />} />
        <Route path="kreator/fiszka/:token?" element={<FiszkaPage />} />
        <Route path="kreator/finansowanie" element={<FinansowaniePage />} />
        <Route path="kreator/wniosek/:token" element={<WniosekPage />} />
        <Route path="kreator/canva/:token?" element={<CanvaPage />} />
        <Route path="admin" element={<AdminLayout />}>
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
