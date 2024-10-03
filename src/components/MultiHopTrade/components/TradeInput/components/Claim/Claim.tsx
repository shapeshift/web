import { Card } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeInputTab, TradeRoutePaths } from 'components/MultiHopTrade/types'

import { TradeInputHeader } from '../TradeInputHeader'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

const ClaimSelect = makeSuspenseful(
  lazy(() =>
    import('./ClaimSelect').then(({ ClaimSelect }) => ({
      default: ClaimSelect,
    })),
  ),
)

const ClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./ClaimConfirm').then(({ ClaimConfirm }) => ({
      default: ClaimConfirm,
    })),
  ),
)

const ClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./ClaimStatus').then(({ ClaimStatus }) => ({
      default: ClaimStatus,
    })),
  ),
)

const ClaimRouteEntries = [ClaimRoutePaths.Select, ClaimRoutePaths.Confirm, ClaimRoutePaths.Status]

export const Claim = ({ isCompact }: { isCompact?: boolean }) => {
  const location = useLocation()
  const history = useHistory()

  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      if (newTab === TradeInputTab.Trade) {
        history.push(TradeRoutePaths.Input)
      }
    },
    [history],
  )

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect setActiveClaim={setActiveClaim} />
  }, [])

  const renderClaimConfirm = useCallback(() => {
    if (!activeClaim) return null

    return (
      <ClaimConfirm
        activeClaim={activeClaim}
        setClaimTxHash={setClaimTxHash}
        setClaimTxStatus={setClaimTxStatus}
      />
    )
  }, [activeClaim, setClaimTxHash, setClaimTxStatus])

  const renderClaimStatus = useCallback(() => {
    if (!activeClaim) return null
    if (!claimTxHash) return null
    if (!claimTxStatus) return null

    return (
      <ClaimStatus
        activeClaim={activeClaim}
        claimTxHash={claimTxHash}
        claimTxStatus={claimTxStatus}
      />
    )
  }, [activeClaim, claimTxHash, claimTxStatus])

  return (
    <TradeSlideTransition>
      <MemoryRouter initialEntries={ClaimRouteEntries} initialIndex={0}>
        <Switch location={location}>
          <Card flex={1} width='full' maxWidth='500px'>
            <TradeInputHeader
              initialTab={TradeInputTab.Claim}
              onChangeTab={handleChangeTab}
              isLoading={false}
              isCompact={isCompact}
            />
            <Suspense>
              <Route
                key={ClaimRoutePaths.Select}
                path={ClaimRoutePaths.Select}
                render={renderClaimSelect}
              />
              <Route
                key={ClaimRoutePaths.Confirm}
                path={ClaimRoutePaths.Confirm}
                render={renderClaimConfirm}
              />
              <Route
                key={ClaimRoutePaths.Status}
                path={ClaimRoutePaths.Status}
                render={renderClaimStatus}
              />
            </Suspense>
          </Card>
        </Switch>
      </MemoryRouter>
    </TradeSlideTransition>
  )
}
