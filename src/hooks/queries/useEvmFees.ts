import type { ChainId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectEvmFees } from 'react-queries/selectors'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  assertGetEvmChainAdapter,
  getFeesWithWallet,
  type GetFeesWithWalletArgs,
  isGetFeesWithWalletArgs,
} from 'lib/utils/evm'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseEvmFeesProps = Omit<
  GetFeesWithWalletArgs,
  'wallet' | 'adapter' | 'accountNumber' | 'data'
> & {
  accountNumber: number | undefined
  data: string | undefined
  chainId: ChainId
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false | undefined
  refetchIntervalInBackground?: boolean
}

export const useEvmFees = (props: UseEvmFeesProps) => {
  const wallet = useWallet().state.wallet

  const {
    enabled = true,
    staleTime,
    refetchInterval,
    refetchIntervalInBackground,
    ...input
  } = props

  const adapter = useMemo(() => assertGetEvmChainAdapter(input.chainId), [input.chainId])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, input.chainId))
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const getFeesWithWalletInput = useMemo(
    () => ({ ...input, adapter, wallet }),
    [adapter, input, wallet],
  )

  const query = useQuery({
    queryKey: reactQueries.common.evmFees(input).queryKey,
    queryFn:
      isGetFeesWithWalletArgs(getFeesWithWalletInput) && enabled
        ? () => getFeesWithWallet(getFeesWithWalletInput)
        : skipToken,
    select: feeAsset ? fees => selectEvmFees(fees, feeAsset, feeAssetMarketData) : undefined,
    staleTime,
    refetchInterval,
    refetchIntervalInBackground,
  })

  return query
}
