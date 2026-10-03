import { Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import InnovationPage from '@/pages/InnovationPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ZasobnikPage from '@/pages/ZasobnikPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="zasobnik" element={<ZasobnikPage />} />
        <Route path="innowacja/:slug" element={<InnovationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
