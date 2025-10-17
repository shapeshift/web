import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import * as adapters from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
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

const OPTIMISTIC_ROLLUP_CHAIN_IDS = [KnownChainIds.OptimismMainnet, KnownChainIds.BaseMainnet]

const supportsL1Gas = (chainId: ChainId) => {
  return OPTIMISTIC_ROLLUP_CHAIN_IDS.includes(chainId as KnownChainIds)
}

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
    queryFn: Boolean(chainId && transaction)
      ? async () => {
          const chainAdapter = getChainAdapterManager().get(chainId) as EvmChainAdapter
          if (!chainAdapter) return null

          return await chainAdapter.getGasFeeData()
        }
      : skipToken,
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  })

  const feeData = useMemo(() => {
    if (!gasFeeDataQuery.data) return

    return gasFeeDataQuery.data[speed]
  }, [gasFeeDataQuery.data, speed])

  const simulationQuery = useQuery({
    queryKey: [
      'tenderlySimulateTransaction',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
      feeData,
    ],
    queryFn:
      transaction && feeData
        ? () =>
            simulateTransaction({
              chainId,
              from: transaction.from,
              to: transaction.to,
              data: transaction.data,
              value: transaction.value,
              feeData,
            })
        : skipToken,
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  })

  // For optimistic rollups, get full fee data which includes l1GasLimit
  // This runs after the Tenderly simulation completes, so we get fully accurate gas sim i.e
  // l2Fee + (l1GasLimit * l1GasPrice)
  const feeDataQuery = useQuery({
    queryKey: [
      'getFeeData',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
    ],
    queryFn:
      transaction && simulationQuery.data && supportsL1Gas(chainId)
        ? async () => {
            const chainAdapter = getChainAdapterManager().get(chainId) as EvmChainAdapter
            if (!chainAdapter) return null

            return await chainAdapter.getFeeData({
              to: transaction.to,
              value: BigInt(transaction.value ?? 0).toString(),
              chainSpecific: {
                from: transaction.from,
                data: transaction.data,
              },
            })
          }
        : skipToken,
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
    enabled: !!simulationQuery.data && supportsL1Gas(chainId),
  })

  const fee = useMemo(() => {
    if (!simulationQuery?.data || !feeData) {
      return null
    }

    if (supportsL1Gas(chainId) && feeDataQuery.isLoading) return null

    const state = store.getState()
    const feeAsset = selectFeeAssetByChainId(state, chainId)
    const marketData = feeAsset
      ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId)
      : null

    if (!feeAsset || !marketData) {
      return null
    }

    const l1GasLimit = feeDataQuery.data?.[speed].chainSpecific.l1GasLimit

    const txFeeCryptoBaseUnit = adapters.evm.calcNetworkFeeCryptoBaseUnit({
      ...feeData,
      gasLimit: simulationQuery.data.transaction.gas_used.toString(),
      l1GasLimit,
      supportsEIP1559: true,
    })

    const txFeeCryptoPrecision = bnOrZero(fromBaseUnit(txFeeCryptoBaseUnit, feeAsset.precision))
    const fiatFee = txFeeCryptoPrecision.times(bnOrZero(marketData.price))

    return {
      txFeeCryptoBaseUnit,
      txFeeCryptoPrecision: txFeeCryptoPrecision.toFixed(6),
      fiatFee: fiatFee.toFixed(2),
      feeAsset,
    }
  }, [simulationQuery?.data, feeData, chainId, feeDataQuery.data, feeDataQuery.isLoading, speed])

  return {
    simulationQuery,
    gasFeeDataQuery,
    feeDataQuery,
    fee,
  }
}
