import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ChainflipLendingAccountProvider } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { Markets } from '@/pages/ChainflipLending/components/Markets'
import { MyBalances } from '@/pages/ChainflipLending/components/MyBalances'
import { Pool } from '@/pages/ChainflipLending/Pool/Pool'

const overview = <Markets />
const myBalances = <MyBalances />
const pool = <Pool />

export const ChainflipLending = memo(() => (
  <ChainflipLendingAccountProvider>
    <Routes>
      <Route index element={overview} />
      <Route path='balances' element={myBalances} />
      <Route path='pool/*' element={pool} />
    </Routes>
  </ChainflipLendingAccountProvider>
))
