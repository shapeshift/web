import { foxAssetId, foxOnArbitrumOneAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

const suspenseFallback = <div>Loading...</div>

const BridgeConfirm = makeSuspenseful(
  lazy(() =>
    import('./BridgeConfirm').then(({ BridgeConfirm }) => ({
      default: BridgeConfirm,
    })),
  ),
)

const BridgeStatus = makeSuspenseful(
  lazy(() =>
    import('./BridgeStatus').then(({ BridgeStatus }) => ({
      default: BridgeStatus,
    })),
  ),
)

const BridgeEntries = [BridgeRoutePaths.Confirm, BridgeRoutePaths.Status]

export const Bridge: React.FC<BridgeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={BridgeEntries} initialIndex={0}>
      <BridgeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const BridgeRoutes: React.FC<BridgeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  // TODO(gomes): remove dummy quote, and actually setBridgeQuote once we consume this as part of the staking flow -
  // or maybe not even and just capture in closure, as we will just instantiate this component with the bridge quote already
  // i.e when pushing to bridge, we will push with query args and use react-router to consume these here

  const sellAssetId = foxAssetId
  const buyAssetId = foxOnArbitrumOneAssetId
  const sellAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, fromAssetId(sellAssetId).chainId),
  )
  const buyAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, fromAssetId(buyAssetId).chainId),
  )

  const dummyBridgeQuote: RfoxBridgeQuote = {
    sellAssetId,
    buyAssetId,
    sellAssetAccountId: sellAssetAccountId ?? '',
    buyAssetAccountId: buyAssetAccountId ?? '',
    bridgeAmountCryptoBaseUnit: '1000000000000000000',
  }
  const [bridgeQuote] = useState<RfoxBridgeQuote | undefined>(dummyBridgeQuote)

  const renderBridgeConfirm = useCallback(() => {
    if (!bridgeQuote) return null

    return <BridgeConfirm bridgeQuote={bridgeQuote} headerComponent={headerComponent} />
  }, [bridgeQuote, headerComponent])

  const renderBridgeStatus = useCallback(() => {
    if (!bridgeQuote) return null

    return <BridgeStatus confirmedQuote={bridgeQuote} headerComponent={headerComponent} />
  }, [bridgeQuote, headerComponent])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={BridgeRoutePaths.Confirm}
            path={BridgeRoutePaths.Confirm}
            render={renderBridgeConfirm}
          />
          <Route
            key={BridgeRoutePaths.Status}
            path={BridgeRoutePaths.Status}
            render={renderBridgeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
