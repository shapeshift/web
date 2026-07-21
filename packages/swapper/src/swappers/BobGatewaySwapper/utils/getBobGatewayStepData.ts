import type { GatewayQuoteV3 } from '@gobob/bob-sdk'
import { fromChainId, tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type {
  GetTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import {
  BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT,
  BOB_GATEWAY_ONRAMP_DEFAULT_TX_VSIZE,
  BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT,
} from './constants'
import { createBobGatewayOrder, toTronBase58 } from './helpers'

export const getBobGatewayRateNetworkFeeCryptoBaseUnit = async (
  quote: GatewayQuoteV3,
  sellAsset: Asset,
  { assertGetEvmChainAdapter, assertGetUtxoChainAdapter, assertGetTronChainAdapter }: SwapperDeps,
  supportsEIP1559: boolean,
): Promise<string | undefined> => {
  try {
    if ('onramp' in quote) {
      const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.httpProvider.getNetworkFees()
      if (!fast?.satsPerKiloByte) return

      const satsPerByte = Math.max(1, Math.ceil(fast.satsPerKiloByte / 1000))

      return bnOrZero(satsPerByte).times(BOB_GATEWAY_ONRAMP_DEFAULT_TX_VSIZE).toFixed(0)
    }

    if (sellAsset.chainId === tronChainId) {
      const adapter = assertGetTronChainAdapter(sellAsset.chainId)

      const order = (() => {
        if ('offramp' in quote) return quote.offramp
        if ('tokenSwap' in quote) return quote.tokenSwap
      })()

      if (!order) return

      const { fast } = await adapter.getFeeData({
        to: toTronBase58(order.txTo),
        value: order.inputAmount.amount,
        chainSpecific: { contractAddress: contractAddressOrUndefined(sellAsset.assetId) },
      })

      return fast.txFee
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const gasLimit =
      'offramp' in quote
        ? BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT
        : BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT

    return getEvmNetworkFeeCryptoBaseUnit({ adapter, supportsEIP1559, gasLimit })
  } catch {}
}

export const getBobGatewayStepData = async ({
  input,
  deps,
  quote,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
}: {
  input: GetTradeQuoteInput
  deps: SwapperDeps
  quote: GatewayQuoteV3
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
}): Promise<
  Result<
    { orderId: string; transactionData: TxBuildData; feeData: Omit<QuoteFeeData, 'protocolFees'> },
    SwapErrorRight
  >
> => {
  const { assertGetUtxoChainAdapter, assertGetEvmChainAdapter, assertGetTronChainAdapter } = deps

  const maybeOrderResponse = await createBobGatewayOrder(deps.config, quote)

  if (maybeOrderResponse.isErr()) return Err(maybeOrderResponse.unwrapErr())
  const orderResponse = maybeOrderResponse.unwrap()

  try {
    // onramp (BTC→EVM): utxo deposit
    if ('onramp' in orderResponse) {
      if (!('xpub' in input)) throw new Error('[BobGateway] invalid utxo quote')

      const transactionData: TxBuildData = {
        type: 'utxo',
        to: orderResponse.onramp.address,
        opReturnData: orderResponse.onramp.opReturnData ?? '',
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      }

      const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to: transactionData.to,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: input.xpub, opReturnData: transactionData.opReturnData },
        sendMax: false,
      })

      return Ok({
        orderId: orderResponse.onramp.orderId,
        transactionData,
        feeData: {
          networkFeeCryptoBaseUnit: fast.txFee,
          chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
        },
      })
    }

    // offramp (EVM/Tron→BTC) and tokenSwap (EVM/Tron→EVM/Tron) orders share the same tx shape
    const order = (() => {
      if ('offramp' in orderResponse) return orderResponse.offramp
      if ('tokenSwap' in orderResponse) return orderResponse.tokenSwap
      return undefined
    })()

    if (!order) throw new Error('[BobGateway] unknown order type')
    const { tx, orderId } = order

    if (tx.type === 'evm') {
      if (!input.sendAddress || !('supportsEIP1559' in input)) {
        throw new Error('[BobGateway] invalid evm quote')
      }

      const transactionData: TxBuildData = {
        type: 'evm',
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: tx.to,
        data: tx.data,
        value: tx.value,
      }

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter: assertGetEvmChainAdapter(sellAsset.chainId),
        transactionData,
        from: input.sendAddress,
        supportsEIP1559: input.supportsEIP1559,
        gasLimitBuffer: 1.2,
      })

      return Ok({ orderId, transactionData, feeData: { networkFeeCryptoBaseUnit } })
    }

    if (tx.type === 'tron') {
      if (!input.sendAddress) throw new Error('[BobGateway] invalid tron quote')

      const transactionData: TxBuildData = {
        type: 'tron',
        to: tx.to,
        data: tx.data,
        value: tx.value,
      }

      const adapter = assertGetTronChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to: toTronBase58(tx.to),
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return Ok({ orderId, transactionData, feeData: { networkFeeCryptoBaseUnit: fast.txFee } })
    }

    throw new Error('[BobGateway] unknown order type')
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to build trade step',
        code: TradeQuoteError.UnknownError,
        cause: err,
      }),
    )
  }
}
