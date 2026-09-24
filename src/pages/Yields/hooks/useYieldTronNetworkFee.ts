import type { ChainId } from '@shapeshiftoss/caip'
import { tronChainId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getTronContractCallFromUnsignedTransaction } from '@/lib/yieldxyz/tron'
import type { TransactionDto } from '@/lib/yieldxyz/types'
import { TransactionStatus } from '@/lib/yieldxyz/types'
import { reactQueries } from '@/react-queries'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseYieldTronNetworkFeeArgs = {
  chainId: ChainId | undefined
  transactions: TransactionDto[] | undefined
  from: string | undefined
}

// Prices the next tron call up front; yield.xyz's gasEstimate only covers bandwidth, and later steps are priced again right before they are signed
export const useYieldTronNetworkFee = ({
  chainId,
  transactions,
  from,
}: UseYieldTronNetworkFeeArgs) => {
  const feeAsset = useAppSelector(state =>
    chainId === tronChainId ? selectFeeAssetByChainId(state, chainId) : undefined,
  )

  const call = useMemo(() => {
    if (chainId !== tronChainId) return
    const createdTx = transactions?.find(tx => tx.status === TransactionStatus.Created)
    return createdTx && getTronContractCallFromUnsignedTransaction(createdTx.unsignedTransaction)
  }, [chainId, transactions])

  const isEnabled = Boolean(call && from)

  const { data, isLoading, isPlaceholderData, isError } = useQuery({
    ...reactQueries.common.tronFees({
      chainId,
      to: call?.to,
      from,
      value: call?.value ?? '0',
      data: call?.data,
    }),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: false,
    // the last fee stays on screen while the next amount's call is priced
    placeholderData: keepPreviousData,
  })

  const networkFeeCryptoBaseUnit = data?.networkFeeCryptoBaseUnit

  const networkFeeCryptoPrecision = useMemo(
    () =>
      networkFeeCryptoBaseUnit && feeAsset
        ? BigAmount.fromBaseUnit({
            value: networkFeeCryptoBaseUnit,
            precision: feeAsset.precision,
          }).toPrecision()
        : undefined,
    [networkFeeCryptoBaseUnit, feeAsset],
  )

  return {
    hasContractCall: Boolean(call),
    networkFeeCryptoBaseUnit,
    networkFeeCryptoPrecision,
    isLoading: isEnabled && (isLoading || isPlaceholderData),
    isError: isEnabled && isError,
  }
}
