import type { GridProps } from '@chakra-ui/react'
import { Route, Routes, useMatch } from 'react-router-dom'

import { AvailablePools } from './AvailablePools'
import { Pool } from './Pool/Pool'
import { YourLoans } from './YourLoans'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

export const LendingPage = () => {
  const match = useMatch('/*')
  const basePath = match?.pathnameBase || ''

  return (
    <Routes>
      <Route path={`${basePath}`} element={<AvailablePools />} />
      <Route path={`${basePath}/loans`} element={<YourLoans />} />
      <Route path={`${basePath}/poolAccount/:poolAccountId/:poolAssetId`} element={<Pool />} />
      <Route path={`${basePath}/pool/:poolAssetId`} element={<Pool />} />
    </Routes>
  )
}
