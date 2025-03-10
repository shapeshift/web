import { Card } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'

export const Claim = ({ onChangeTab }: { onChangeTab: (newTab: TradeInputTab) => void }) => {
  const location = useLocation()
  const history = useHistory()

  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  const handleTabChange = useCallback((tab: TradeInputTab) => {
    switch (tab) {
      case 'trade':
        history.push('/trade')
        break
      case 'limitOrder':
        history.push('/limit')
        break
      case 'claim':
        // Already on claim, do nothing
        break
      default:
        break
    }
  }, [history])

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
        <SharedTradeInputHeader initialTab={TradeInputTab.Claim} onChangeTab={handleTabChange} />
        <Route
          path={ClaimRoutePaths.Select}
          render={renderClaimSelect}
        />
        <Route
          path={ClaimRoutePaths.Confirm}
          render={renderClaimConfirm}
        />
        <Route
          path={ClaimRoutePaths.Status}
          render={renderClaimStatus}
        />
      </Card>
    </Switch>
  )
}
