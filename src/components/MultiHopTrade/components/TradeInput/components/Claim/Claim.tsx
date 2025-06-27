import { Card, Stack } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { TradeInputTab } from '@/components/MultiHopTrade/types'

const cardBorderRadius = { base: '0', md: '2xl' }
const cardBgProp = { base: 'background.surface.base', md: 'background.surface.raised.accent' }
const cardMinHeight = { base: 'calc(100vh - var(--mobile-nav-offset))', md: 'initial' }

export const Claim = ({ onChangeTab }: { onChangeTab: (newTab: TradeInputTab) => void }) => {
  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  const claimSelect = useMemo(() => {
    return <ClaimSelect setActiveClaim={setActiveClaim} />
  }, [])

  const claimConfirm = useMemo(() => {
    // We should always have an active claim at confirm step.
    // If we don't, we've either rehydrated, tried to access /claim/confirm directly, or something went wrong.
    // Either way, route back to select
    if (!activeClaim) return <Navigate to={ClaimRoutePaths.Select} />

    return (
      <ClaimConfirm
        activeClaim={activeClaim}
        setClaimTxHash={setClaimTxHash}
        setClaimTxStatus={setClaimTxStatus}
      />
    )
  }, [activeClaim, setClaimTxHash, setClaimTxStatus])

  const claimStatus = useMemo(() => {
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
    <Stack spacing={0} width='full' maxWidth='500px'>
      <Card flex={1} borderRadius={cardBorderRadius} bg={cardBgProp} minHeight={cardMinHeight}>
        <SharedTradeInputHeader initialTab={TradeInputTab.Claim} onChangeTab={onChangeTab} />
        <Routes>
          <Route
            key={ClaimRoutePaths.Confirm}
            path={ClaimRoutePaths.Confirm}
            element={claimConfirm}
          />
          <Route key={ClaimRoutePaths.Status} path={ClaimRoutePaths.Status} element={claimStatus} />
          <Route key={ClaimRoutePaths.Select} path={'*'} element={claimSelect} />
        </Routes>
      </Card>
    </Stack>
  )
}
