import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isUtxoChainId } from 'lib/utils/utxo'

type UseIsSweepNeededQueryProps = {
  assetId: AssetId | undefined
  address: string | null
  amountCryptoBaseUnit: string
  txFeeCryptoBaseUnit: string
  enabled: boolean
}

export type IsSweepNeededQueryKey = [
  'isSweepNeeded',
  {
    assetId: AssetId | undefined
    address: string | null
    amountCryptoBaseUnit: string
    txFeeCryptoBaseUnit: string
  },
]

const getIsSweepNeeded = async ({
  assetId,
  address,
  amountCryptoBaseUnit,
  txFeeCryptoBaseUnit,
}: {
  assetId: AssetId
  address: string | undefined
  amountCryptoBaseUnit: string
  txFeeCryptoBaseUnit: string
}) => {
  // This should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
  if (!address) return
  const adapter = getChainAdapterManager().get(fromAssetId(assetId).chainId)
  if (!adapter) return
  const { chainId } = fromAssetId(assetId)
  // Chains others than UTXO don't require a sweep step
  if (!isUtxoChainId(chainId)) return false

  const addressAccount = await adapter?.getAccount(address)
  const hasEnoughBalance = bnOrZero(amountCryptoBaseUnit)
    .plus(bnOrZero(txFeeCryptoBaseUnit))
    .lte(addressAccount.balance)

  return !hasEnoughBalance
}

export const queryFn = async ({ queryKey }: { queryKey: IsSweepNeededQueryKey }) => {
  const { assetId, address, amountCryptoBaseUnit, txFeeCryptoBaseUnit } = queryKey[1]

  if (!assetId) throw new Error('assetId is required')
  if (!address) throw new Error('address is required')

  const isSweepNeeded = await getIsSweepNeeded({
    assetId,
    address,
    amountCryptoBaseUnit,
    txFeeCryptoBaseUnit,
  })
  return isSweepNeeded
}

export const useIsSweepNeededQuery = ({
  assetId,
  address,
  amountCryptoBaseUnit,
  txFeeCryptoBaseUnit,
  enabled,
}: UseIsSweepNeededQueryProps) => {
  const isSweepNeededQueryKey: IsSweepNeededQueryKey = useMemo(
    () => ['isSweepNeeded', { assetId, address, amountCryptoBaseUnit, txFeeCryptoBaseUnit }],
    [assetId, address, amountCryptoBaseUnit, txFeeCryptoBaseUnit],
  )

  const isSweepNeededQuery = useQuery({
    queryKey: isSweepNeededQueryKey,
    queryFn,
    enabled: Boolean(enabled && address && assetId),
  })

  return isSweepNeededQuery
}
