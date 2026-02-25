import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { EgressMachineCtx } from '../EgressMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { queryLiquidityWithdrawalStatus } from '@/lib/chainflip/explorerApi'
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

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const { data: withdrawalStatus } = useQuery({
    queryKey: ['chainflipEgressStatus', destinationAddress, cfAsset?.asset, cfAsset?.chain],
    queryFn: () => {
      if (!cfAsset || !destinationAddress) return null
      return queryLiquidityWithdrawalStatus(destinationAddress, cfAsset.asset, cfAsset.chain)
    },
    enabled: isConfirming && !!cfAsset && !!destinationAddress,
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
    if (!isConfirming) {
      pollCountRef.current = 0
      return
    }

    if (!withdrawalStatus) return

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
