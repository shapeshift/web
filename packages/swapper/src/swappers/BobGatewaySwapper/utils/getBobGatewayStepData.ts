import type { GatewayQuoteV3 } from '@gobob/bob-sdk'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  makeNetworkFeeEstimationFailedErr,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utils/utxo'
import {
  BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT,
  BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT,
} from './constants'
import { createBobGatewayOrder, toTronBase58 } from './helpers'

type BaseArgs = {
  quote: GatewayQuoteV3
  sellAmountCryptoBaseUnit: string
}

export type GetBobGatewayStepDataArgs = StepDataArgs<BaseArgs>

type BobGatewayRateStepData = {
  networkFeeCryptoBaseUnit: string | undefined
}

type BobGatewayQuoteStepData = {
  orderId: string
  transactionData: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}

export function getBobGatewayStepData(
  args: Extract<GetBobGatewayStepDataArgs, { type: 'rate' }>,
): Promise<Result<BobGatewayRateStepData, SwapErrorRight>>
export function getBobGatewayStepData(
  args: Extract<GetBobGatewayStepDataArgs, { type: 'quote' }>,
): Promise<Result<BobGatewayQuoteStepData, SwapErrorRight>>
export async function getBobGatewayStepData(
  args: GetBobGatewayStepDataArgs,
): Promise<Result<BobGatewayRateStepData | BobGatewayQuoteStepData, SwapErrorRight>> {
  const { input, quote, sellAsset, sellAmountCryptoBaseUnit, deps } = args
  const { chainNamespace } = fromChainId(sellAsset.chainId)

  // Rates estimate off the quote shape; quotes resolve the executable order once up front
  const maybeResolved = await (async () => {
    if (args.type === 'rate') return Ok({ type: 'rate' as const })

    const maybeOrderResponse = await createBobGatewayOrder(deps.config, quote)
    if (maybeOrderResponse.isErr()) return Err(maybeOrderResponse.unwrapErr())

    return Ok({
      type: 'quote' as const,
      orderResponse: maybeOrderResponse.unwrap(),
      from: args.from,
    })
  })()

  if (maybeResolved.isErr()) return Err(maybeResolved.unwrapErr())
  const resolved = maybeResolved.unwrap()

  switch (chainNamespace) {
    // BTC sells (onramp BTC -> EVM/TRON)
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
      const pubkey = 'xpub' in input ? input.xpub : undefined

      if (resolved.type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
              adapter,
              pubkey,
              to: input.sendAddress ?? UTXO_PLACEHOLDER_ADDRESS,
              value: sellAmountCryptoBaseUnit,
            })

            return networkFeeCryptoBaseUnit
          } catch {}
        })()

        const stepData: BobGatewayRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { orderResponse } = resolved

      if (!('onramp' in orderResponse))
        return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))

      const transactionData: TxBuildData = {
        type: 'utxo',
        to: orderResponse.onramp.address,
        opReturnData: orderResponse.onramp.opReturnData ?? undefined,
        value: sellAmountCryptoBaseUnit,
      }

      try {
        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter,
          pubkey,
          to: transactionData.to,
          value: sellAmountCryptoBaseUnit,
          opReturnData: transactionData.opReturnData,
        })

        const stepData: BobGatewayQuoteStepData = {
          orderId: orderResponse.onramp.orderId,
          transactionData,
          networkFeeCryptoBaseUnit,
        }

        return Ok(stepData)
      } catch (err) {
        return Err(makeNetworkFeeEstimationFailedErr('getBobGatewayStepData', err))
      }
    }
    // EVM sells (offramp EVM → BTC, or tokenSwap EVM → Tron)
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

      if (resolved.type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          if (!('offramp' in quote) && !('tokenSwap' in quote)) return

          try {
            const gasLimit =
              'offramp' in quote
                ? BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT
                : BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT

            return await getEvmNetworkFeeCryptoBaseUnit({
              adapter,
              supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
              gasLimit,
            })
          } catch {}
        })()

        const stepData: BobGatewayRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { orderResponse, from } = resolved

      if (!('offramp' in orderResponse) && !('tokenSwap' in orderResponse))
        return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))

      const order = 'offramp' in orderResponse ? orderResponse.offramp : orderResponse.tokenSwap

      if (order.tx.type !== 'evm') return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))
      const { tx, orderId } = order

      if (!('supportsEIP1559' in input))
        return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))

      const transactionData: TxBuildData = {
        type: 'evm',
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: tx.to,
        data: tx.data,
        value: tx.value,
      }

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559: input.supportsEIP1559,
          gasLimitBuffer: 1.2,
          stateOverride: {
            sellAsset,
            sellAmountCryptoBaseUnit,
            spenderAddress: tx.to,
          },
        })

        const stepData: BobGatewayQuoteStepData = {
          orderId,
          transactionData,
          networkFeeCryptoBaseUnit,
        }

        return Ok(stepData)
      } catch (err) {
        return Err(makeNetworkFeeEstimationFailedErr('getBobGatewayStepData', err))
      }
    }
    // Tron sells (offramp Tron → BTC, or tokenSwap TRON → EVM)
    case CHAIN_NAMESPACE.Tron: {
      const adapter = deps.assertGetTronChainAdapter(sellAsset.chainId)
      const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

      if (resolved.type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            if (!('offramp' in quote) && !('tokenSwap' in quote)) return

            const order = 'offramp' in quote ? quote.offramp : quote.tokenSwap

            const { fast } = await adapter.getFeeData({
              to: toTronBase58(order.txTo),
              value: order.inputAmount.amount,
              chainSpecific: { contractAddress },
            })

            return fast.txFee
          } catch {}
        })()

        const stepData: BobGatewayRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { orderResponse, from } = resolved

      if (!('offramp' in orderResponse) && !('tokenSwap' in orderResponse))
        return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))

      const order = 'offramp' in orderResponse ? orderResponse.offramp : orderResponse.tokenSwap

      if (order.tx.type !== 'tron') return Err(makeTradeStepBuildFailedErr('getBobGatewayStepData'))
      const { tx, orderId } = order

      const transactionData: TxBuildData = {
        type: 'tron',
        to: tx.to,
        data: tx.data,
        value: tx.value,
      }

      try {
        const { fast } = await adapter.getFeeData({
          to: toTronBase58(tx.to),
          value: sellAmountCryptoBaseUnit,
          chainSpecific: { from, contractAddress },
        })

        const stepData: BobGatewayQuoteStepData = {
          orderId,
          transactionData,
          networkFeeCryptoBaseUnit: fast.txFee,
        }

        return Ok(stepData)
      } catch (err) {
        return Err(makeNetworkFeeEstimationFailedErr('getBobGatewayStepData', err))
      }
    }
    default:
      return Err(
        makeSwapErrorRight({
          message: `[BobGateway] unsupported chain namespace: ${chainNamespace}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
  }
}
