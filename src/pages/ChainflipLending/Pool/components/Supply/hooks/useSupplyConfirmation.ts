import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { SupplyMachineCtx } from '../SupplyMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const MAX_POLL_ATTEMPTS = 20

export const useSupplyConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = SupplyMachineCtx.useActorRef()
  const stateValue = SupplyMachineCtx.useSelector(s => s.value)
  const { assetId, initialLendingPositionCryptoBaseUnit, supplyAmountCryptoBaseUnit } =
    SupplyMachineCtx.useSelector(s => ({
      assetId: s.context.assetId,
      initialLendingPositionCryptoBaseUnit: s.context.initialLendingPositionCryptoBaseUnit,
      supplyAmountCryptoBaseUnit: s.context.supplyAmountCryptoBaseUnit,
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
      actorRef.send({ type: 'SUPPLY_TIMEOUT', error: 'Confirmation timed out' })
      return
    }

    const matchingPosition = accountInfo.lending_positions.find(
      (p: { chain: string; asset: string; total_amount?: string }) =>
        p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )

    if (!matchingPosition?.total_amount) return

    try {
      const currentPositionCryptoBaseUnit = BigInt(matchingPosition.total_amount)
      const previousPositionCryptoBaseUnit = BigInt(initialLendingPositionCryptoBaseUnit || '0')
      const delta = currentPositionCryptoBaseUnit - previousPositionCryptoBaseUnit
      const supplyAmountBigInt = BigInt(supplyAmountCryptoBaseUnit || '0')
      const threshold = supplyAmountBigInt > 10n ? (supplyAmountBigInt * 9n) / 10n : 1n

      if (delta >= threshold) {
        void invalidateQueries()
        actorRef.send({ type: 'SUPPLY_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [
    isConfirming,
    accountInfo,
    cfAsset,
    initialLendingPositionCryptoBaseUnit,
    supplyAmountCryptoBaseUnit,
    actorRef,
    invalidateQueries,
  ])
}
