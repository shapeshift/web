import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { cfFreeBalances } from '@/lib/chainflip/rpc'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

const POLL_INTERVAL_MS = 6_000

export const useDepositConfirmation = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const { assetId, initialFreeBalanceCryptoBaseUnit } = DepositMachineCtx.useSelector(s => ({
    assetId: s.context.assetId,
    initialFreeBalanceCryptoBaseUnit: s.context.initialFreeBalanceCryptoBaseUnit,
  }))
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const shouldPoll = isConfirming && !!scAccount

  const { data: freeBalances } = useQuery({
    queryKey: ['chainflipFreeBalances', scAccount],
    queryFn: shouldPoll && scAccount ? () => cfFreeBalances(scAccount) : skipToken,
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
  })

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  useEffect(() => {
    if (!isConfirming || !freeBalances || !cfAsset) return

    const matchingBalance = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )

    const currentBalanceCryptoBaseUnit = BigInt(matchingBalance?.balance || '0')
    const previousBalanceCryptoBaseUnit = BigInt(initialFreeBalanceCryptoBaseUnit || '0')

    if (currentBalanceCryptoBaseUnit > previousBalanceCryptoBaseUnit) {
      actorRef.send({ type: 'CONFIRMED' })
    }
  }, [isConfirming, freeBalances, cfAsset, initialFreeBalanceCryptoBaseUnit, actorRef])
}
