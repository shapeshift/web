import type { GridProps } from '@chakra-ui/react'
import { Route, Routes } from 'react-router-dom'

import { AvailablePools } from './AvailablePools'
import { Pool } from './Pool/Pool'
import { YourLoans } from './YourLoans'

const availablePools = <AvailablePools />
const yourLoans = <YourLoans />
const pool = <Pool />

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

export const LendingPage = () => (
  <Routes>
    <Route path={'/'} index element={availablePools} />
    <Route path={'/poolAccount/:poolAccountId/*'} element={pool} />
    <Route path={'/pool/*'} element={pool} />
    <Route path={'/loans'} element={yourLoans} />
  </Routes>
)
