import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { EgressMachineCtx } from '../EgressMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000

export const useEgressConfirmation = () => {
  const actorRef = EgressMachineCtx.useActorRef()
  const stateValue = EgressMachineCtx.useSelector(s => s.value)
  const assetId = EgressMachineCtx.useSelector(s => s.context.assetId)
  const initialFreeBalanceCryptoBaseUnit = EgressMachineCtx.useSelector(
    s => s.context.initialFreeBalanceCryptoBaseUnit,
  )
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'

  const { data: freeBalances } = useQuery({
    ...reactQueries.chainflipLending.freeBalances(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (!isConfirming || !freeBalances || !cfAsset) return

    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )

    const currentBalance = matching?.balance ?? '0'

    try {
      const currentBalanceBigInt = BigInt(currentBalance)
      const initialBalanceBigInt = BigInt(initialFreeBalanceCryptoBaseUnit || '0')

      if (currentBalanceBigInt < initialBalanceBigInt) {
        actorRef.send({ type: 'EGRESS_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [isConfirming, freeBalances, cfAsset, initialFreeBalanceCryptoBaseUnit, actorRef])
}
