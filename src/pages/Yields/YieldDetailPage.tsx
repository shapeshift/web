import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { YieldAccountProvider } from '@/pages/Yields/YieldAccountContext'
import { YieldDetailRouter } from '@/pages/Yields/Yields'

export const YieldDetailPage = memo(() => (
  <YieldAccountProvider>
    <Routes>
      <Route path='*' element={<YieldDetailRouter />} />
    </Routes>
  </YieldAccountProvider>
))
