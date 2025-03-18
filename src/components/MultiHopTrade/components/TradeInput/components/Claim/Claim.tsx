import { Card, Stack } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { FoxWifHatBanner } from '@/components/FoxWifHatBanner'
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
    // We should always have an active claim at confirm step.
    // If we don't, we've either rehydrated, tried to access /claim/confirm directly, or something went wrong.
    // Either way, route back to select
    if (!activeClaim) return <Redirect to={ClaimRoutePaths.Select} />

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
      <Stack spacing={0} width='full' maxWidth='500px'>
        <FoxWifHatBanner />
        <Card flex={1}>
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
      </Stack>
    </Switch>
  )
}
