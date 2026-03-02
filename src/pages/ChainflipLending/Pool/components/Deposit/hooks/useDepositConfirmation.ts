import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const MAX_POLL_ATTEMPTS = 20

export const useDepositConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const { assetId, initialFreeBalanceCryptoBaseUnit } = DepositMachineCtx.useSelector(s => ({
    assetId: s.context.assetId,
    initialFreeBalanceCryptoBaseUnit: s.context.initialFreeBalanceCryptoBaseUnit,
  }))
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const pollCountRef = useRef(0)

  const { data: freeBalances, dataUpdatedAt } = useQuery({
    ...reactQueries.chainflipLending.freeBalances(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

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

    pollCountRef.current += 1
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      actorRef.send({ type: 'CONFIRMATION_ERROR', error: 'Confirmation timed out' })
      return
    }

    if (!Array.isArray(freeBalances) || !cfAsset) return

    const matchingBalance = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )

    try {
      const currentBalanceCryptoBaseUnit = BigInt(matchingBalance?.balance || '0')
      const previousBalanceCryptoBaseUnit = BigInt(initialFreeBalanceCryptoBaseUnit || '0')

      if (currentBalanceCryptoBaseUnit > previousBalanceCryptoBaseUnit) {
        void invalidateQueries()
        actorRef.send({ type: 'CONFIRMED' })
      }
    } catch (error) {
      console.error('[useDepositConfirmation] Error parsing free balances during confirmation poll', error)
    }
  }, [
    isConfirming,
    freeBalances,
    dataUpdatedAt,
    cfAsset,
    initialFreeBalanceCryptoBaseUnit,
    actorRef,
    invalidateQueries,
  ])
}
