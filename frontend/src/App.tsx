import { Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import InnovationPage from '@/pages/InnovationPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="innowacja/:slug" element={<InnovationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
