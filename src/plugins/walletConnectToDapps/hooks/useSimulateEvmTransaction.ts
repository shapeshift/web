import type { ChainId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { BigAmount } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { useMemo } from 'react'

import type { TransactionParams } from '../types'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { toNumberString } from '@/plugins/walletConnectToDapps/utils'
import { simulateTransaction } from '@/plugins/walletConnectToDapps/utils/tenderly'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

// Headroom on the recommended gas limit for state drift between estimation and broadcast
const GAS_LIMIT_BUFFER_MULTIPLIER = 1.2

export const useSimulateEvmTransaction = ({
  transaction,
  chainId,
  speed = FeeDataKey.Fast,
  gasLimit: userGasLimit,
}: {
  transaction: TransactionParams | undefined
  chainId: ChainId
  speed?: FeeDataKey
  // dApp-supplied or user-edited gas limit, which takes precedence over the recommendation
  gasLimit?: string
}) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const marketData = useAppSelector(state =>
    feeAsset ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId) : null,
  )

  // Calldata decoding, asset changes and gas_used; fixed per tx, so never polled
  const tenderlySimulationQuery = useQuery({
    queryKey: [
      'tenderlySimulation',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.gas,
      transaction?.value,
    ],
    queryFn: transaction
      ? () =>
          simulateTransaction({
            chainId,
            from: transaction.from,
            to: transaction.to,
            gas: transaction.gas ? Number(transaction.gas) : undefined,
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

  // Gas limit from eth_estimateGas, since Tenderly's gas_used is net of refunds
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
    retry: false,
  })

  const recommendedGasLimit = useMemo(() => {
    if (gasLimitQuery.isLoading) return

    const baseGasLimit =
      gasLimitQuery.data?.gasLimit ?? tenderlySimulationQuery.data?.transaction.gas_used
    if (!baseGasLimit) return

    return bnOrZero(baseGasLimit)
      .times(GAS_LIMIT_BUFFER_MULTIPLIER)
      .integerValue(BigNumber.ROUND_CEIL)
      .toFixed()
  }, [gasLimitQuery.isLoading, gasLimitQuery.data, tenderlySimulationQuery.data])

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
    fee,
  }
}
