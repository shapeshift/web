import { lazy } from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'

import { makeSuspenseful } from '@/utils/makeSuspenseful'

const AvailablePools = makeSuspenseful(
  lazy(() =>
    import('./AvailablePools').then(({ AvailablePools }) => ({ default: AvailablePools })),
  ),
)
const Pool = makeSuspenseful(
  lazy(() => import('./Pool/Pool').then(({ Pool }) => ({ default: Pool }))),
)

const YourPositions = makeSuspenseful(
  lazy(() => import('./YourPositions').then(({ YourPositions }) => ({ default: YourPositions }))),
)

const Position = makeSuspenseful(
  lazy(() => import('./Position/Position').then(({ Position }) => ({ default: Position }))),
)

const AddLiquidityPage = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityPage').then(({ AddLiquidityPage }) => ({ default: AddLiquidityPage })),
  ),
)

export const PoolsPage = () => {
  const match = useMatch('/*')
  const basePath = match?.pathnameBase || ''

  return (
    <Routes>
      <Route path={`${basePath}`} element={<AvailablePools />} />
      <Route path={`${basePath}/positions`} element={<YourPositions />} />
      <Route
        path={`${basePath}/positions/:poolAssetId/:accountId/:opportunityId`}
        element={<Position />}
      />
      <Route
        path={`${basePath}/add/:poolAssetId?/:opportunityId?`}
        element={<AddLiquidityPage />}
      />
      <Route path={`${basePath}/:poolAssetId`} element={<Pool />} />
    </Routes>
  )
}
