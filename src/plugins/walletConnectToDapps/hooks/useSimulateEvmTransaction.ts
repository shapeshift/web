import type { ChainId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { BigAmount } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { TransactionParams } from '../types'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import {
  getGasEstimateFailure,
  getRecommendedGasLimit,
  toNumberString,
} from '@/plugins/walletConnectToDapps/utils'
import { simulateTransaction } from '@/plugins/walletConnectToDapps/utils/tenderly'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useSimulateEvmTransaction = ({
  transaction,
  chainId,
  speed = FeeDataKey.Fast,
  gasLimit: userGasLimit,
}: {
  transaction: TransactionParams | undefined
  chainId: ChainId
  speed?: FeeDataKey
  // User-edited gas limit, which takes precedence over the recommendation
  gasLimit?: string
}) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const marketData = useAppSelector(state =>
    feeAsset ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId) : null,
  )

  // dApp gas is only a floor since dApps can under-estimate it
  const dappGasLimit = toNumberString(transaction?.gasLimit ?? transaction?.gas)

  // Calldata decoding and asset changes for display; fixed per tx, so never polled
  const tenderlySimulationQuery = useQuery({
    queryKey: [
      'tenderlySimulation',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
    ],
    queryFn: transaction
      ? () =>
          simulateTransaction({
            chainId,
            from: transaction.from,
            to: transaction.to,
            data: transaction.data,
            value: transaction.value,
          })
      : skipToken,
    // Asset changes can drift with chain state, so not Infinity
    staleTime: 60_000,
    retry: false,
  })

  const gasFeeDataQuery = useQuery({
    queryKey: ['evmGasFeeData', chainId],
    queryFn: transaction ? () => assertGetEvmChainAdapter(chainId).getGasFeeData() : skipToken,
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  })

  const gasLimitQuery = useQuery({
    queryKey: [
      'evmGasLimit',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
    ],
    queryFn: transaction
      ? () =>
          assertGetEvmChainAdapter(chainId).getGasLimit({
            to: transaction.to,
            value: toNumberString(transaction.value) ?? '0',
            chainSpecific: { from: transaction.from, data: transaction.data },
          })
      : skipToken,
    // Per request: a cached revert from an earlier request would bypass the estimate
    gcTime: 0,
    retry: false,
  })

  const recommendedGasLimit = useMemo(() => {
    if (gasLimitQuery.isLoading) return

    return getRecommendedGasLimit(gasLimitQuery.data?.gasLimit, dappGasLimit)
  }, [gasLimitQuery.isLoading, gasLimitQuery.data, dappGasLimit])

  const gasEstimateFailure = useMemo(
    () => getGasEstimateFailure(gasLimitQuery.error),
    [gasLimitQuery.error],
  )

  const gasLimit = bnOrZero(userGasLimit).gt(0) ? userGasLimit : recommendedGasLimit
  const isGasLimitLoading = !gasLimit && gasLimitQuery.isLoading

  const fee = useMemo(() => {
    const feeData = gasFeeDataQuery.data?.[speed]

    if (!gasLimit || !feeData || !feeAsset || !marketData) return null

    // TODO: EIP-1559 support; approveEIP155Request only signs legacy gasPrice txs
    const txFeeCryptoBaseUnit = adapters.evm.calcNetworkFeeCryptoBaseUnit({
      ...feeData,
      gasLimit,
      l1GasLimit: gasLimitQuery.data?.l1GasLimit,
      supportsEIP1559: false,
    })

    const txFeeCryptoPrecision = BigAmount.fromBaseUnit({
      value: txFeeCryptoBaseUnit,
      precision: feeAsset.precision,
    }).toBN()

    return {
      txFeeCryptoBaseUnit,
      txFeeCryptoPrecision: txFeeCryptoPrecision.toFixed(6),
      fiatFee: txFeeCryptoPrecision.times(bnOrZero(marketData.price)).toFixed(2),
      feeAsset,
    }
  }, [gasLimit, gasFeeDataQuery.data, gasLimitQuery.data, speed, feeAsset, marketData])

  return {
    simulationQuery: tenderlySimulationQuery,
    recommendedGasLimit,
    gasLimit,
    isGasLimitLoading,
    gasEstimateFailure,
    isGasEstimateError: gasLimitQuery.isError,
    fee,
  }
}
