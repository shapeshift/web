import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero, contractAddressOrUndefined, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeTradeStepBuildFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { SolanaComputeBudgetOptions } from '../../../utils/solana'
import {
  getSolanaNetworkFeeCryptoBaseUnit,
  omitComputeBudgetInstructions,
  withComputeUnitLimit,
} from '../../../utils/solana'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../../../utils/utxo'
import { getRelayPsbtRelayer } from './getRelayPsbtRelayer'
import { convertRelaySolanaInstruction } from './helpers'
import type { RelayQuoteItem, RelayTransactionMetadata } from './types'
import {
  isRelayQuoteEvmItemData,
  isRelayQuoteSolanaItemData,
  isRelayQuoteTronItemData,
  isRelayQuoteUtxoItemData,
} from './types'

// Bridge-out deposits measure constant compute consumption, but same-chain routes swap through
// Jupiter where pool state moving between simulation and landing (CLMM tick crossings) measured
// ~4% drift on a live route; 1.4 matches Jupiter's dynamicComputeUnitLimit margin
export const RELAY_SOLANA_COMPUTE_BUDGET: SolanaComputeBudgetOptions = { marginMultiplier: 1.4 }

type BaseArgs = {
  data: RelayQuoteItem['data']
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  orderId: string | undefined
  xpub: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string
}

type RelayRateStepData = { networkFeeCryptoBaseUnit: string }
type RelayQuoteStepData = {
  transactionData?: TxBuildData
  relayTransactionMetadata?: RelayTransactionMetadata
  networkFeeCryptoBaseUnit: string
}

export type GetRelayStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

export function getRelayStepData(
  args: Extract<GetRelayStepDataArgs, { type: 'rate' }>,
): Promise<Result<RelayRateStepData, SwapErrorRight>>
export function getRelayStepData(
  args: Extract<GetRelayStepDataArgs, { type: 'quote' }>,
): Promise<Result<RelayQuoteStepData, SwapErrorRight>>
export async function getRelayStepData({
  data,
  sellAsset,
  sellAmountCryptoBaseUnit,
  spenderAddress,
  orderId,
  from,
  xpub,
  type,
  input,
  fallbackNetworkFeeCryptoBaseUnit,
  deps,
}: GetRelayStepDataArgs): Promise<Result<RelayRateStepData | RelayQuoteStepData, SwapErrorRight>> {
  if (!data) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (isRelayQuoteEvmItemData(data)) {
    const { data: callData, gas: relayGasLimit, to, value: _value } = data

    if (!to) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    if (!callData) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    const value = isToken(sellAsset.assetId) ? '0' : _value
    if (typeof value !== 'string') return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    const transactionData: TxBuildData = {
      type: 'evm',
      chainId: Number(fromChainId(sellAsset.chainId).chainReference),
      to,
      value,
      data: callData,
      gasLimit: bnOrZero(relayGasLimit).gt(0) ? relayGasLimit : undefined,
    }

    const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

    const stateOverride = {
      sellAsset,
      sellAmountCryptoBaseUnit,
      spenderAddress,
    }

    if (type === 'rate') {
      const networkFeeCryptoBaseUnit = await (async () => {
        try {
          return await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            transactionData,
            from,
            supportsEIP1559,
            stateOverride,
          })
        } catch {
          return fallbackNetworkFeeCryptoBaseUnit
        }
      })()

      const stepData: RelayRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    }

    // Execution needs the same fee data, so estimation failure fails the quote
    try {
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData,
        from,
        supportsEIP1559,
        stateOverride,
      })

      const stepData: RelayQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

      return Ok(stepData)
    } catch (error) {
      return Err(makeNetworkFeeEstimationFailedErr('getRelayStepData', error))
    }
  }

  if (isRelayQuoteUtxoItemData(data)) {
    if (!data.psbt) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    const relayer = getRelayPsbtRelayer(data.psbt, sellAmountCryptoBaseUnit)

    if (!relayer) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))
    if (!orderId) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    const estimate = () =>
      getUtxoNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
        pubkey: xpub,
        to: relayer,
        value: sellAmountCryptoBaseUnit,
        opReturnData: orderId,
      })

    if (type === 'rate') {
      const networkFeeCryptoBaseUnit = await (async () => {
        try {
          const { networkFeeCryptoBaseUnit } = await estimate()
          return networkFeeCryptoBaseUnit
        } catch {
          return fallbackNetworkFeeCryptoBaseUnit
        }
      })()

      const stepData: RelayRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    }

    try {
      const { networkFeeCryptoBaseUnit } = await estimate()

      const stepData: RelayQuoteStepData = {
        transactionData: {
          type: 'utxo',
          to: relayer,
          opReturnData: orderId,
          value: sellAmountCryptoBaseUnit,
        },
        networkFeeCryptoBaseUnit,
      }

      return Ok(stepData)
    } catch (error) {
      return Err(makeNetworkFeeEstimationFailedErr('getRelayStepData', error))
    }
  }

  if (isRelayQuoteSolanaItemData(data)) {
    const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

    const instructions = omitComputeBudgetInstructions(
      data.instructions?.map(convertRelaySolanaInstruction) ?? [],
    )
    const addressLookupTableAddresses = data.addressLookupTableAddresses ?? []

    if (type === 'rate') {
      // No placeholder estimation for provider built routes - best effort with provider fee fallback
      const networkFeeCryptoBaseUnit = await (async () => {
        try {
          const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from,
            instructions,
            addressLookupTableAddresses,
            tokenId: contractAddressOrUndefined(sellAsset.assetId),
          })
          return networkFeeCryptoBaseUnit
        } catch {
          return fallbackNetworkFeeCryptoBaseUnit
        }
      })()

      const stepData: RelayRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    }

    try {
      const { networkFeeCryptoBaseUnit, feeData, includeComputeBudget } =
        await getSolanaNetworkFeeCryptoBaseUnit({
          adapter,
          from,
          instructions,
          addressLookupTableAddresses,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        })

      const stepData: RelayQuoteStepData = {
        transactionData: {
          type: 'solana_instructions',
          instructions: withComputeUnitLimit({
            instructions,
            computeUnits: feeData.chainSpecific.computeUnits,
            includeComputeBudget,
            computeBudget: RELAY_SOLANA_COMPUTE_BUDGET,
          }),
          addressLookupTableAddresses,
        },
        networkFeeCryptoBaseUnit,
      }

      return Ok(stepData)
    } catch (error) {
      return Err(makeNetworkFeeEstimationFailedErr('getRelayStepData', error))
    }
  }

  if (isRelayQuoteTronItemData(data)) {
    const contractAddress = data.parameter?.contract_address
    const tronCallData = data.parameter?.data
    const isTronToken = isToken(sellAsset.assetId)

    if (isTronToken && !contractAddress) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))
    if (isTronToken && !tronCallData) return Err(makeTradeStepBuildFailedErr('getRelayStepData'))

    if (type === 'rate') {
      const stepData: RelayRateStepData = {
        networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
      }

      return Ok(stepData)
    }

    const stepData: RelayQuoteStepData = {
      relayTransactionMetadata: { to: contractAddress, data: tronCallData },
      networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
    }

    return Ok(stepData)
  }

  return Err(makeTradeStepBuildFailedErr('getRelayStepData'))
}
