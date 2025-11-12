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
import { useAppSelector } from '@/state/store'

const OPTIMISTIC_ROLLUP_CHAIN_IDS = [KnownChainIds.OptimismMainnet, KnownChainIds.BaseMainnet]

const supportsL1Gas = (chainId: ChainId) =>
  OPTIMISTIC_ROLLUP_CHAIN_IDS.includes(chainId as KnownChainIds)

export const useSimulateEvmTransaction = ({
  transaction,
  chainId,
  speed = FeeDataKey.Fast,
}: {
  transaction: TransactionParams | undefined
  chainId: ChainId
  speed?: FeeDataKey
}) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const marketData = useAppSelector(state =>
    feeAsset ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId) : null,
  )

  // For deterministic Tx data (calldata decoding and asset changes)
  // This runs once for a given Tx and never gets refetched regardless of speed change
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
    // Paranoia: technically this *could* be Infinity, but...
    // The "deterministic" above may have been a white lie. A given calldata *will* always be the same decoded,
    // but technically, asset changes could change over blocks depending on the state of the EVM state machine
    staleTime: 60_000,
    retry: false,
  })

  const tenderlyGasEstimateQuery = useQuery({
    queryKey: [
      'tenderlyGasEstimate',
      chainId,
      transaction?.from,
      transaction?.to,
      transaction?.data,
      transaction?.value,
      speed,
    ],
    queryFn: transaction
      ? async () => {
          const chainAdapter = getChainAdapterManager().get(chainId) as EvmChainAdapter
          if (!chainAdapter) return null

          const gasFeeData = await chainAdapter.getGasFeeData()
          const feeData = gasFeeData[speed]

          const simulation = await simulateTransaction({
            chainId,
            from: transaction.from,
            to: transaction.to,
            data: transaction.data,
            value: transaction.value,
            feeData,
          })

          // For optimistic rollups (Arb/Base), also fetch L1 gasLimit to ensure we get accurate calcs taking it into account
          const l1GasLimit =
            supportsL1Gas(chainId) && simulation
              ? (
                  await chainAdapter.getFeeData({
                    to: transaction.to,
                    value: BigInt(transaction.value ?? 0).toString(),
                    chainSpecific: {
                      from: transaction.from,
                      data: transaction.data,
                    },
                  })
                )?.[speed].chainSpecific.l1GasLimit
              : undefined

          return {
            simulation,
            feeData,
            gasFeeData,
            l1GasLimit,
          }
        }
      : skipToken,
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  })

  const fee = useMemo(() => {
    if (!tenderlyGasEstimateQuery?.data?.simulation || !tenderlyGasEstimateQuery?.data?.feeData)
      return null

    if (!feeAsset || !marketData) return null

    const txFeeCryptoBaseUnit = adapters.evm.calcNetworkFeeCryptoBaseUnit({
      ...tenderlyGasEstimateQuery.data.feeData,
      gasLimit: tenderlyGasEstimateQuery.data.simulation.transaction.gas_used.toString(),
      l1GasLimit: tenderlyGasEstimateQuery.data.l1GasLimit,
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
  }, [tenderlyGasEstimateQuery?.data, feeAsset, marketData])

  console.log('in src/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction.ts for near', {
    feeData: tenderlyGasEstimateQuery?.data?.feeData,
    gasLimit: tenderlyGasEstimateQuery.data?.simulation?.transaction.gas_used.toString(),
    fee,
  })

  return {
    simulationQuery: tenderlySimulationQuery,
    gasEstimateQuery: tenderlyGasEstimateQuery,
    fee,
  }
}
