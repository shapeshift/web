import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

type UseIsSweepNeededQueryProps = {
  assetId: AssetId
  address: string | null
  amountCryptoBaseUnit: string
  txFeeCryptoBaseUnit: string
  enabled: boolean
}

export const useIsSweepNeededQuery = ({
  assetId,
  address,
  amountCryptoBaseUnit,
  txFeeCryptoBaseUnit,
  enabled,
}: UseIsSweepNeededQueryProps) => {
  const useIsSweepNeededQueryKey = useMemo(
    () => ['isSweepNeeded', { assetId, address, amountCryptoBaseUnit, txFeeCryptoBaseUnit }],
    [assetId, address, amountCryptoBaseUnit, txFeeCryptoBaseUnit],
  )

  const getIsSweepNeeded = useCallback(
    async (assetId: AssetId, address: string) => {
      const adapter = getChainAdapterManager().get(fromAssetId(assetId).chainId)
      if (!adapter) return
      const { chainId } = fromAssetId(assetId)
      // Chains others than UTXO don't require a sweep step
      if (!isUtxoChainId(chainId)) return false

      const addressAccount = await adapter?.getAccount(address)
      const hasEnoughBalance = bnOrZero(amountCryptoBaseUnit)
        .minus(bnOrZero(txFeeCryptoBaseUnit))
        .lte(addressAccount.balance)

      return hasEnoughBalance
    },
    [amountCryptoBaseUnit, txFeeCryptoBaseUnit],
  )

  const isSweepNeededQuery = useQuery({
    queryKey: useIsSweepNeededQueryKey,
    queryFn: async () => {
      const isSweepNeeded = await getIsSweepNeeded(assetId, address!)
      return isSweepNeeded
    },
    enabled: Boolean(enabled && address),
  })

  return isSweepNeededQuery
}
