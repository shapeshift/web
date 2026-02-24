import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ChainflipLendingAccountProvider } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { BorrowTab } from '@/pages/ChainflipLending/components/BorrowTab'
import { Overview } from '@/pages/ChainflipLending/components/Overview'
import { SupplyTab } from '@/pages/ChainflipLending/components/SupplyTab'

const overview = <Overview />
const supplyTab = <SupplyTab />
const borrowTab = <BorrowTab />

export const ChainflipLending = memo(() => (
  <ChainflipLendingAccountProvider>
    <Routes>
      <Route index element={overview} />
      <Route path='supply' element={supplyTab} />
      <Route path='borrow' element={borrowTab} />
    </Routes>
  </ChainflipLendingAccountProvider>
))
