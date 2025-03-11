import { Card } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { Route, Switch, useLocation } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { TradeInputTab } from '@/components/MultiHopTrade/types'

export const Claim = ({ onChangeTab }: { onChangeTab: (newTab: TradeInputTab) => void }) => {
  const location = useLocation()

  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

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
    <Switch location={location}>
      <Card flex={1} width='full' maxWidth='500px'>
        <SharedTradeInputHeader initialTab={TradeInputTab.Claim} onChangeTab={onChangeTab} />
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
        <Route
          key={ClaimRoutePaths.Select}
          path={ClaimRoutePaths.Select}
          render={renderClaimSelect}
          exact
        />
      </Card>
    </Switch>
  )
}
