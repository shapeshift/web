import type { AssetId } from '@shapeshiftmonorepo/caip'
import { fromAssetId } from '@shapeshiftmonorepo/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { PartialFields } from 'lib/types'
import { isUtxoChainId } from 'lib/utils/utxo'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

type GetIsSwepNeededInput = {
  assetId: AssetId
  address: string
  amountCryptoBaseUnit: string
  txFeeCryptoBaseUnit: string
}

type UseIsSweepNeededQueryProps = PartialFields<
  GetIsSwepNeededInput,
  'assetId' | 'address' | 'txFeeCryptoBaseUnit'
> & {
  enabled?: boolean
}

export const isGetSweepNeededInput = (
  input: UseIsSweepNeededQueryProps,
): input is GetIsSwepNeededInput =>
  Boolean(input.assetId && input.address && input.txFeeCryptoBaseUnit)

export type IsSweepNeededQueryKey = ['isSweepNeeded', UseIsSweepNeededQueryProps]

export const getIsSweepNeeded = async ({
  assetId,
  address,
  amountCryptoBaseUnit,
  txFeeCryptoBaseUnit,
}: GetIsSwepNeededInput) => {
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

export const useIsSweepNeededQuery = ({ enabled = true, ...input }: UseIsSweepNeededQueryProps) => {
  const isSweepNeededQueryKey: IsSweepNeededQueryKey = useMemo(
    () => ['isSweepNeeded', input],
    [input],
  )

  const isSweepNeededQuery = useQuery({
    queryKey: isSweepNeededQueryKey,
    queryFn: enabled && isGetSweepNeededInput(input) ? () => getIsSweepNeeded(input) : skipToken,
  })

  return isSweepNeededQuery
}
