import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import InnovationPage from '@/pages/InnovationPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ZasobnikPage from '@/pages/ZasobnikPage'

// Obszary i rzadziej odwiedzane strony ładują się dopiero po wejściu na trasę (Suspense w Layout)
const AccessibilityStatementPage = lazy(() => import('@/pages/AccessibilityStatementPage'))
const AdminRoutes = lazy(() => import('@/admin/AdminRoutes'))
const MentorsPage = lazy(() => import('@/pages/MentorsPage'))
const MentorThreadPage = lazy(() => import('@/pages/MentorThreadPage'))
const KreatorRoutes = lazy(() => import('@/kreator/KreatorRoutes'))
const ComparePage = lazy(() => import('@/pages/ComparePage'))
const DocumentPage = lazy(() => import('@/pages/DocumentPage'))
const OpenDataPage = lazy(() => import('@/pages/OpenDataPage'))
const PartnershipsPage = lazy(() => import('@/pages/PartnershipsPage'))
const ReportPage = lazy(() => import('@/pages/ReportPage'))
const ServiceCardPage = lazy(() => import('@/pages/ServiceCardPage'))
const ThreadPage = lazy(() => import('@/pages/ThreadPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="zasobnik" element={<ZasobnikPage />} />
        <Route path="innowacja/:slug" element={<InnovationPage />} />
        <Route path="innowacja/:slug/wdrozenie" element={<ServiceCardPage />} />
        <Route path="porownaj" element={<ComparePage />} />
        <Route path="dokument/:id" element={<DocumentPage />} />
        <Route path="otwarte-dane" element={<OpenDataPage />} />
        <Route path="zglos" element={<ReportPage />} />
        <Route path="partnerstwa" element={<PartnershipsPage />} />
        <Route path="mentorzy" element={<MentorsPage />} />
        <Route path="mentor/:mentorToken/:threadToken" element={<MentorThreadPage />} />
        <Route path="watek/:token" element={<ThreadPage />} />
        <Route path="dostepnosc" element={<AccessibilityStatementPage />} />
        <Route path="kreator/*" element={<KreatorRoutes />} />
        <Route path="admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
