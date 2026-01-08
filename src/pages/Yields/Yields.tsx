import { Route, Routes } from 'react-router-dom'

import { YieldsList } from '@/pages/Yields/components/YieldsList'
import { YieldAccountProvider } from '@/pages/Yields/YieldAccountContext'
import { YieldAssetDetails } from '@/pages/Yields/YieldAssetDetails'
import { YieldDetail } from '@/pages/Yields/YieldDetail'

export const Yields = () => {
  return (
    <YieldAccountProvider>
      <Routes>
        <Route path='asset/:assetId' element={<YieldAssetDetails />} />
        <Route index element={<YieldsList />} />
        <Route path=':yieldId/enter' element={<YieldDetail />} />
        <Route path=':yieldId/exit' element={<YieldDetail />} />
        <Route path=':yieldId' element={<YieldDetail />} />
      </Routes>
    </YieldAccountProvider>
  )
}
