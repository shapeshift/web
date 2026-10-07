import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import * as adapters from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { TransactionParams } from '../types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { simulateTransaction } from '@/plugins/walletConnectToDapps/utils/tenderly'
import type { TenderlySimulationResponse } from '@/plugins/walletConnectToDapps/utils/tenderly/types'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TenderlyGasEstimateQueryData = {
  simulation: TenderlySimulationResponse | null
  feeData: adapters.evm.GasFeeData
  gasFeeData: adapters.evm.GasFeeDataEstimate
  estimatedGasLimit: adapters.evm.GasLimitEstimate['gasLimit'] | undefined
  l1GasLimit: adapters.evm.GasLimitEstimate['l1GasLimit']
  // The gas limit we fill into the form when the dApp didn't supply one
  baseGasLimit: string | undefined
}

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
      transaction?.gas,
      transaction?.value,
    ],
    queryFn: transaction
      ? () =>
          simulateTransaction({
            chainId,
            from: transaction.from,
            to: transaction.to,
            gas: Number(transaction.gas),
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
      transaction?.gas,
      transaction?.data,
      transaction?.value,
      speed,
    ],
    queryFn: transaction
      ? async (): Promise<TenderlyGasEstimateQueryData | null> => {
          const chainAdapter = getChainAdapterManager().get(chainId) as EvmChainAdapter
          if (!chainAdapter) return null

          const gasFeeData = await chainAdapter.getGasFeeData()
          const feeData = gasFeeData[speed]

          // Gas limit comes from eth_estimateGas, not getFeeData. getFeeData estimates gas and
          // then fetches prices again; a price failure there would discard a good estimate and
          // fall back to Tenderly gas_used, which can be too low once refunds are applied.
          const [simulation, gasLimitEstimate] = await Promise.all([
            simulateTransaction({
              chainId,
              from: transaction.from,
              to: transaction.to,
              gas: Number(transaction.gas),
              data: transaction.data,
              value: transaction.value,
              feeData,
            }),
            chainAdapter
              .getGasLimit({
                to: transaction.to,
                value: BigInt(transaction.value ?? 0).toString(),
                chainSpecific: {
                  from: transaction.from,
                  data: transaction.data,
                },
              })
              .catch(() => undefined),
          ])

          // Tenderly's gas_used is net of refunds (up to 20% of gas spent), but refunds are only
          // credited after execution, so the gas limit must come from eth_estimateGas instead.
          const estimatedGasLimit: TenderlyGasEstimateQueryData['estimatedGasLimit'] =
            gasLimitEstimate?.gasLimit

          // For optimistic rollups (Arb/Base), also fetch L1 gasLimit to ensure we get accurate calcs taking it into account
          const l1GasLimit: TenderlyGasEstimateQueryData['l1GasLimit'] = supportsL1Gas(chainId)
            ? gasLimitEstimate?.l1GasLimit
            : undefined

          return {
            simulation,
            feeData,
            gasFeeData,
            estimatedGasLimit,
            l1GasLimit,
            baseGasLimit: estimatedGasLimit ?? simulation?.transaction.gas_used.toString(),
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

    const txFeeCryptoPrecision = BigAmount.fromBaseUnit({
      value: txFeeCryptoBaseUnit,
      precision: feeAsset.precision,
    }).toBN()
    const fiatFee = txFeeCryptoPrecision.times(bnOrZero(marketData.price))

    return {
      txFeeCryptoBaseUnit,
      txFeeCryptoPrecision: txFeeCryptoPrecision.toFixed(6),
      fiatFee: fiatFee.toFixed(2),
      feeAsset,
    }
  }, [tenderlyGasEstimateQuery?.data, feeAsset, marketData])

  return {
    simulationQuery: tenderlySimulationQuery,
    gasEstimateQuery: tenderlyGasEstimateQuery,
    fee,
  }
}
