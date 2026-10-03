import { Route, Routes } from 'react-router-dom'

import CanvaPage from '@/kreator/CanvaPage'
import FinansowaniePage from '@/kreator/FinansowaniePage'
import FiszkaPage from '@/kreator/FiszkaPage'
import KreatorHome from '@/kreator/KreatorHome'
import WniosekPage from '@/kreator/WniosekPage'
import NotFoundPage from '@/pages/NotFoundPage'

/** Cały Kreator w jednym chunku (ładowany leniwie z `App` pod `kreator/*`). */
export default function KreatorRoutes() {
  return (
    <Routes>
      <Route index element={<KreatorHome />} />
      <Route path="fiszka/:token?" element={<FiszkaPage />} />
      <Route path="finansowanie" element={<FinansowaniePage />} />
      <Route path="wniosek/:token" element={<WniosekPage />} />
      <Route path="canva/:token?" element={<CanvaPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
