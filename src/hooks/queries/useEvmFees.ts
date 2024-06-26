import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
  'wallet' | 'adapter' | 'accountNumber' | 'data' | 'to'
> & {
  accountNumber: number | undefined
  data: string | undefined
  to: string | undefined
  chainId: ChainId | undefined
  enabled?: boolean
  staleTime?: number
  refetchInterval: number | false | undefined
  refetchIntervalInBackground: boolean
}

export const useEvmFees = (props: UseEvmFeesProps) => {
  const wallet = useWallet().state.wallet

  const { enabled, staleTime, refetchInterval, refetchIntervalInBackground, input } = useMemo(
    () => {
      const {
        enabled = true,
        staleTime,
        refetchInterval,
        refetchIntervalInBackground,
        ...input
      } = props

      return {
        enabled,
        staleTime,
        refetchInterval,
        refetchIntervalInBackground,
        input,
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.values(props),
  )

  const adapter = useMemo(
    () =>
      input.chainId && isEvmChainId(input.chainId)
        ? assertGetEvmChainAdapter(input.chainId)
        : undefined,
    [input.chainId],
  )

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, input.chainId ?? ''))
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
