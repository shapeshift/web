import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EgressMachineCtx } from '../EgressMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import {
  queryLatestWithdrawalId,
  queryLiquidityWithdrawalStatus,
} from '@/lib/chainflip/explorerApi'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 60_000
const MAX_POLL_ATTEMPTS = 30

export const useEgressConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = EgressMachineCtx.useActorRef()
  const stateValue = EgressMachineCtx.useSelector(s => s.value)
  const assetId = EgressMachineCtx.useSelector(s => s.context.assetId)
  const destinationAddress = EgressMachineCtx.useSelector(s => s.context.destinationAddress)
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const pollCountRef = useRef(0)
  const [baselineId, setBaselineId] = useState<number | null>(null)

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (!isConfirming || baselineId !== null) return
    if (!cfAsset || !destinationAddress) return

    void queryLatestWithdrawalId(destinationAddress, cfAsset.asset, cfAsset.chain)
      .then(id => {
        setBaselineId(id)
      })
      .catch(() => {
        actorRef.send({ type: 'EGRESS_TIMEOUT', error: 'Failed to fetch withdrawal baseline' })
      })
  }, [isConfirming, baselineId, cfAsset, destinationAddress, actorRef])

  const { data: withdrawalStatus } = useQuery({
    queryKey: [
      'chainflipEgressStatus',
      destinationAddress,
      cfAsset?.asset,
      cfAsset?.chain,
      baselineId,
    ],
    queryFn: () => {
      if (!cfAsset || !destinationAddress || baselineId === null) return null
      return queryLiquidityWithdrawalStatus(
        destinationAddress,
        cfAsset.asset,
        cfAsset.chain,
        baselineId,
      )
    },
    enabled: isConfirming && !!cfAsset && !!destinationAddress && baselineId !== null,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const invalidateQueries = useCallback(async () => {
    if (!scAccount) return
    await Promise.all([
      queryClient.invalidateQueries(reactQueries.chainflipLending.freeBalances(scAccount)),
      queryClient.invalidateQueries(reactQueries.chainflipLending.accountInfo(scAccount)),
    ])
  }, [queryClient, scAccount])

  useEffect(() => {
    if (stateValue === 'input') {
      pollCountRef.current = 0
      setBaselineId(null)
      queryClient.removeQueries({ queryKey: ['chainflipEgressStatus'] })
    }
    if (stateValue === 'confirming') {
      pollCountRef.current = 0
    }
  }, [stateValue, queryClient])

  useEffect(() => {
    if (!isConfirming || !withdrawalStatus) return

    pollCountRef.current += 1
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      actorRef.send({ type: 'EGRESS_TIMEOUT', error: 'Confirmation timed out' })
      return
    }

    if (withdrawalStatus.broadcastComplete && withdrawalStatus.transactionRef) {
      void invalidateQueries()
      actorRef.send({
        type: 'EGRESS_CONFIRMED',
        egressTxRef: withdrawalStatus.transactionRef,
      })
    }
  }, [isConfirming, withdrawalStatus, actorRef, invalidateQueries])
}
