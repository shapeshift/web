import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { TransactionParams } from '../types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { simulateTransaction } from '@/plugins/walletConnectToDapps/utils/tenderly'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { store } from '@/state/store'

export const useSimulateEvmTransaction = ({
  transaction,
  chainId,
  speed = FeeDataKey.Fast,
}: {
  transaction: TransactionParams | undefined
  chainId: ChainId
  speed?: FeeDataKey
}) => {
  const gasFeeDataQuery = useQuery({
    queryKey: ['getEvmGasFeeData', chainId],
    queryFn: Boolean(chainId)
      ? async () => {
          const chainAdapter = getChainAdapterManager().get(chainId) as EvmChainAdapter
          if (!chainAdapter) return null

          return await chainAdapter.getGasFeeData()
        }
      : skipToken,
    staleTime: 30000,
    retry: false,
  })

  const gasPrice = useMemo(() => {
    if (!gasFeeDataQuery.data) return

    const feeData = gasFeeDataQuery.data[speed]

    return feeData?.gasPrice || feeData?.maxFeePerGas
  }, [gasFeeDataQuery.data, speed])

  const simulationQuery = useQuery({
    queryKey: [
      'tenderlySimulateTransaction',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
      gasPrice,
    ],
    queryFn:
      transaction && gasPrice
        ? () =>
            simulateTransaction({
              chainId,
              from: transaction.from,
              to: transaction.to,
              data: transaction.data,
              value: transaction.value,
              gasPrice,
            })
        : skipToken,
    staleTime: 30000,
    retry: false,
  })

  const fee = useMemo(() => {
    if (!simulationQuery?.data || !gasPrice) {
      return null
    }

    const state = store.getState()
    const feeAsset = selectFeeAssetByChainId(state, chainId)
    const marketData = feeAsset
      ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId)
      : null

    if (!feeAsset || !marketData) {
      return null
    }

    const txFeeCryptoBaseUnit = bnOrZero(gasPrice).times(simulationQuery.data.transaction.gas_used)
    const txFeeCryptoPrecision = bnOrZero(
      fromBaseUnit(txFeeCryptoBaseUnit.toFixed(), feeAsset.precision),
    )
    const fiatFee = txFeeCryptoPrecision.times(bnOrZero(marketData.price))

    return {
      txFeeCryptoBaseUnit: txFeeCryptoBaseUnit.toFixed(),
      txFeeCryptoPrecision: txFeeCryptoPrecision.toFixed(6),
      fiatFee: fiatFee.toFixed(2),
      feeAsset,
    }
  }, [simulationQuery?.data, gasPrice, chainId])

  return {
    simulationQuery,
    gasFeeDataQuery,
    gasPrice,
    fee,
  }
}
