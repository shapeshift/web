import { lazy, useMemo } from 'react'
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

  const availablePoolsElement = useMemo(() => <AvailablePools />, [])
  const yourPositionsElement = useMemo(() => <YourPositions />, [])
  const positionElement = useMemo(() => <Position />, [])
  const addLiquidityElement = useMemo(() => <AddLiquidityPage />, [])
  const poolElement = useMemo(() => <Pool />, [])

  return (
    <Routes>
      <Route path={`${basePath}`} element={availablePoolsElement} />
      <Route path={`${basePath}/positions`} element={yourPositionsElement} />
      <Route
        path={`${basePath}/positions/:poolAssetId/:accountId/:opportunityId`}
        element={positionElement}
      />
      <Route path={`${basePath}/add/:poolAssetId?/:opportunityId?`} element={addLiquidityElement} />
      <Route path={`${basePath}/:poolAssetId`} element={poolElement} />
    </Routes>
  )
}
