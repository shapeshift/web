import type { GridProps } from '@chakra-ui/react'
import { type ChainId, ethChainId } from '@shapeshiftoss/caip'
import { lazy, useMemo, useState } from 'react'
import { Route, Switch, useRouteMatch } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { Main } from 'components/Layout/Main'

import { PoolsHeader } from './components/PoolsHeader'

export const poolRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

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
  const { path } = useRouteMatch()
  const [searchQuery, setSearchQuery] = useState('')
  const [availableChainIds, setAvailableChainIds] = useState<ChainId[] | []>([])
  const [filterByChainId, setFilterByChainId] = useState<ChainId | undefined>(ethChainId)
  const headerComponent = useMemo(
    () => (
      <PoolsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        chainIds={availableChainIds}
        onChainIdChange={setFilterByChainId}
        filterByChainId={filterByChainId}
      />
    ),
    [availableChainIds, filterByChainId, searchQuery],
  )

  const topLevelRoutes = useMemo(() => [`${path}`, `${path}/positions`], [path])

  return (
    <Switch>
      <Route exact path={topLevelRoutes}>
        <Main headerComponent={headerComponent}>
          <Switch>
            <Route exact path={`${path}`}>
              <AvailablePools
                searchQuery={searchQuery}
                setChainIds={setAvailableChainIds}
                filterByChainId={filterByChainId}
              />
            </Route>
            <Route exact path={`${path}/positions`}>
              <YourPositions />
            </Route>
          </Switch>
        </Main>
      </Route>
      <Route path={`${path}/positions/:poolAssetId/:accountId/:opportunityId`}>
        <Position />
      </Route>
      <Route path={`${path}/add/:poolAssetId?/:opportunityId?`}>
        <AddLiquidityPage />
      </Route>
      <Route path={`${path}/:poolAssetId`}>
        <Pool />
      </Route>
    </Switch>
  )
}
