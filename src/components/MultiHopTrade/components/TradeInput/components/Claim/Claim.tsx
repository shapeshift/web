import { Card, Stack } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { cardstyles } from '@/components/MultiHopTrade/const'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  isArbitrumBridgeWithdrawAction,
} from '@/state/slices/actionSlice/types'
import { store, useAppDispatch } from '@/state/store'

const cardBorderRadius = { base: '0', md: '2xl' }
const cardMinHeight = { base: 'calc(100vh - var(--mobile-nav-offset))', md: 'initial' }

export const Claim = ({ onChangeTab }: { onChangeTab: (newTab: TradeInputTab) => void }) => {
  const dispatch = useAppDispatch()
  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  // Get existing claims to migrate to actions for validation
  const { claimsByStatus } = useArbitrumClaimsByStatus()

  // VALIDATION: Migrate existing pending/available claims to actions when Claims tab mounts
  useEffect(() => {
    const allClaims = [...claimsByStatus.Available, ...claimsByStatus.Pending]

    allClaims.forEach(claimDetail => {
      const withdrawTxHash = claimDetail.tx.txid

      // Check if we already have an action for this claim
      const existingAction = Object.values(store.getState().action.byId).find(
        action =>
          isArbitrumBridgeWithdrawAction(action) &&
          action.arbitrumBridgeMetadata.withdrawTxHash === withdrawTxHash,
      )

      // If no existing action, create one for validation
      if (!existingAction) {
        const status = claimsByStatus.Available.includes(claimDetail)
          ? ActionStatus.ClaimAvailable
          : ActionStatus.Initiated

        dispatch(
          actionSlice.actions.upsertAction({
            id: uuidv4(),
            createdAt: claimDetail.tx.blockTime * 1000, // Convert to milliseconds
            updatedAt: Date.now(),
            type: ActionType.ArbitrumBridgeWithdraw,
            status,
            arbitrumBridgeMetadata: {
              withdrawTxHash,
              amountCryptoBaseUnit: claimDetail.amountCryptoBaseUnit,
              assetId: claimDetail.assetId,
              destinationAssetId: claimDetail.destinationAssetId,
              destinationAddress: claimDetail.destinationAddress,
              accountId: claimDetail.accountId,
              chainId: claimDetail.tx.chainId,
              destinationChainId: claimDetail.destinationChainId,
              timeRemainingSeconds: claimDetail.timeRemainingSeconds,
              claimDetails: claimDetail,
            },
          }),
        )
      }
    })
  }, [dispatch, claimsByStatus])

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
      <Card flex={1} borderRadius={cardBorderRadius} minHeight={cardMinHeight} {...cardstyles}>
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
