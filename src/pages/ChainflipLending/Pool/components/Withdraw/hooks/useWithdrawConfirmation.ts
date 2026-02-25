import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { WithdrawMachineCtx } from '../WithdrawMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const MAX_POLL_ATTEMPTS = 20

export const useWithdrawConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = WithdrawMachineCtx.useActorRef()
  const stateValue = WithdrawMachineCtx.useSelector(s => s.value)
  const { assetId, supplyPositionCryptoBaseUnit } = WithdrawMachineCtx.useSelector(s => ({
    assetId: s.context.assetId,
    supplyPositionCryptoBaseUnit: s.context.supplyPositionCryptoBaseUnit,
  }))
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const pollCountRef = useRef(0)

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const { data: accountInfo } = useQuery({
    ...reactQueries.chainflipLending.accountInfo(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
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
    }
  }, [stateValue])

  useEffect(() => {
    if (!isConfirming) return

    pollCountRef.current += 1
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      actorRef.send({ type: 'WITHDRAW_TIMEOUT', error: 'Confirmation timed out' })
      return
    }

    if (!accountInfo?.lending_positions || !cfAsset) return

    const matchingPosition = accountInfo.lending_positions.find(
      p => p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )

    try {
      const currentPositionCryptoBaseUnit = BigInt(matchingPosition?.total_amount || '0')
      const previousPositionCryptoBaseUnit = BigInt(supplyPositionCryptoBaseUnit || '0')

      if (currentPositionCryptoBaseUnit < previousPositionCryptoBaseUnit) {
        void invalidateQueries()
        actorRef.send({ type: 'WITHDRAW_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [
    isConfirming,
    accountInfo,
    cfAsset,
    supplyPositionCryptoBaseUnit,
    actorRef,
    invalidateQueries,
  ])
}
