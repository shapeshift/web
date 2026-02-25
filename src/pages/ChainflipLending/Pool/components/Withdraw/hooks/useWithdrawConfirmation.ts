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

  const { data: accountInfo } = useQuery({
    ...reactQueries.chainflipLending.accountInfo(scAccount ?? ''),
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

    if (!accountInfo?.lending_positions || !cfAsset) return

    pollCountRef.current += 1
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      actorRef.send({ type: 'WITHDRAW_TIMEOUT', error: 'Confirmation timed out' })
      return
    }

    const matchingPosition = accountInfo.lending_positions.find(
      p => p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )

    const currentPositionCryptoBaseUnit = (() => {
      if (!matchingPosition?.total_amount) return 0n
      try {
        return BigInt(matchingPosition.total_amount)
      } catch {
        return 0n
      }
    })()

    const previousPositionCryptoBaseUnit = (() => {
      try {
        return BigInt(supplyPositionCryptoBaseUnit || '0')
      } catch {
        return 0n
      }
    })()

    if (currentPositionCryptoBaseUnit < previousPositionCryptoBaseUnit) {
      void invalidateQueries()
      actorRef.send({ type: 'WITHDRAW_CONFIRMED' })
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
