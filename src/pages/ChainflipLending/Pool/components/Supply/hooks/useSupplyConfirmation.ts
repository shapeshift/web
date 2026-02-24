import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { SupplyMachineCtx } from '../SupplyMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000

export const useSupplyConfirmation = () => {
  const actorRef = SupplyMachineCtx.useActorRef()
  const stateValue = SupplyMachineCtx.useSelector(s => s.value)
  const { assetId, initialLendingPositionCryptoBaseUnit } = SupplyMachineCtx.useSelector(s => ({
    assetId: s.context.assetId,
    initialLendingPositionCryptoBaseUnit: s.context.initialLendingPositionCryptoBaseUnit,
  }))
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'

  const { data: accountInfo } = useQuery({
    ...reactQueries.chainflipLending.accountInfo(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (!isConfirming || !accountInfo?.lending_positions || !cfAsset) return

    const matchingPosition = accountInfo.lending_positions.find(
      (p: { chain: string; asset: string; total_amount?: string }) =>
        p.chain === cfAsset.chain && p.asset === cfAsset.asset,
    )

    if (!matchingPosition?.total_amount) return

    try {
      const currentPositionCryptoBaseUnit = BigInt(matchingPosition.total_amount)
      const previousPositionCryptoBaseUnit = BigInt(initialLendingPositionCryptoBaseUnit || '0')

      if (currentPositionCryptoBaseUnit > previousPositionCryptoBaseUnit) {
        actorRef.send({ type: 'SUPPLY_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [isConfirming, accountInfo, cfAsset, initialLendingPositionCryptoBaseUnit, actorRef])
}
