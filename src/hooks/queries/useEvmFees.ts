import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectEvmFees } from 'react-queries/selectors'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { MaybeGetFeesWithWalletArgs } from 'lib/utils/evm'
import {
  assertGetEvmChainAdapter,
  getFeesWithWalletEIP1559Support,
  isGetFeesWithWalletEIP1559SupportArgs,
} from 'lib/utils/evm'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseEvmFeesProps = {
  from: string | undefined
  chainId: ChainId | undefined
  data: string | undefined
  enabled?: boolean
  refetchInterval: number | false | undefined
  refetchIntervalInBackground?: boolean
  staleTime?: number
  to: string | undefined
  value: string
}

export const useEvmFees = ({
  from,
  chainId,
  data,
  refetchInterval,
  refetchIntervalInBackground,
  to,
  value,
  enabled = true,
  staleTime,
}: UseEvmFeesProps) => {
  const wallet = useWallet().state.wallet

  const adapter = useMemo(() => {
    return chainId && isEvmChainId(chainId) ? assertGetEvmChainAdapter(chainId) : undefined
  }, [chainId])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId ?? ''))
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const getFeesWithWalletEIP1559SupportInput: MaybeGetFeesWithWalletArgs = useMemo(() => {
    return { adapter, data, to, value, from, wallet }
  }, [adapter, data, from, to, value, wallet])

  const query = useQuery({
    queryKey: reactQueries.common.evmFees({ chainId, value, data, from, to }).queryKey,
    queryFn:
      isGetFeesWithWalletEIP1559SupportArgs(getFeesWithWalletEIP1559SupportInput) && enabled
        ? () => getFeesWithWalletEIP1559Support(getFeesWithWalletEIP1559SupportInput)
        : skipToken,
    select: feeAsset ? fees => selectEvmFees(fees, feeAsset, feeAssetMarketData) : undefined,
    staleTime,
    refetchInterval,
    refetchIntervalInBackground,
  })

  return query
}
