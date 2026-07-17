import type { GatewayQuoteV3 } from '@gobob/bob-sdk'
import { GatewayErrorCode, isGatewayError } from '@gobob/bob-sdk'
import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type {
  GetTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  SwapperConfig,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BobGatewayOrder } from '../types'
import { getBobGatewayClient, toTronBase58 } from './helpers'

// Creates the BOB Gateway order and builds the executable TxBuildData for the step. EVM/UTXO/Tron all
// flow through transactionData; Tron uses the tron variant (feeLimit is unused at exec).
const createBobGatewayOrder = async (
  config: SwapperConfig,
  gatewayQuote: GatewayQuoteV3,
  sellAsset: Asset,
  value: string,
): Promise<Result<BobGatewayOrder, SwapErrorRight>> => {
  try {
    const orderResponse = await getBobGatewayClient(config).api.createOrderV3({
      gatewayQuoteV3: gatewayQuote,
    })

    // onramp (BTC→EVM)
    if ('onramp' in orderResponse) {
      return Ok({
        orderId: orderResponse.onramp.orderId,
        transactionData: {
          type: 'utxo' as const,
          to: orderResponse.onramp.address,
          opReturnData: orderResponse.onramp.opReturnData ?? '',
          value,
        },
      })
    }

    // offramp (EVM/Tron→BTC) and tokenSwap (EVM/Tron→EVM/Tron) orders share the same tx shape
    const order = (() => {
      if ('offramp' in orderResponse) return orderResponse.offramp
      if ('tokenSwap' in orderResponse) return orderResponse.tokenSwap
      return undefined
    })()

    if (order) {
      const { tx, orderId } = order

      if (tx.type === 'evm') {
        return Ok({
          orderId,
          transactionData: {
            type: 'evm' as const,
            chainId: Number(fromChainId(sellAsset.chainId).chainReference),
            to: tx.to,
            data: tx.data,
            value: tx.value,
          },
        })
      }

      // Tron is carried via the TxBuildData tron variant (Bob's feeLimit is unused at exec)
      if (tx.type === 'tron') {
        return Ok({
          orderId,
          transactionData: {
            type: 'tron' as const,
            to: tx.to,
            data: tx.data,
            value: tx.value,
          },
        })
      }
    }

    throw new Error('Unknown order type')
  } catch (err) {
    if (isGatewayError(err) && err.code === GatewayErrorCode.InsufficientConfirmedFunds) {
      return Err(
        makeSwapErrorRight({
          message: '[BobGateway] insufficient confirmed balance',
          code: TradeQuoteError.InsufficientFundsUnconfirmed,
          cause: err,
        }),
      )
    }

    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to create order',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}

// Prices the network fee from the same transactionData that gets executed. EVM bakes a 1.2x-buffered
// gasLimit onto the tx while pricing the unbuffered estimate for display; UTXO/Tron price via their
// respective adapters.
const getBobGatewayQuoteFeeData = async (
  input: GetTradeQuoteInput,
  { assertGetUtxoChainAdapter, assertGetEvmChainAdapter, assertGetTronChainAdapter }: SwapperDeps,
  transactionData: TxBuildData,
): Promise<Result<Omit<QuoteFeeData, 'protocolFees'>, SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  try {
    if (transactionData.type === 'utxo' && 'xpub' in input) {
      const { to, opReturnData } = transactionData

      const { fast } = await assertGetUtxoChainAdapter(sellAsset.chainId).getFeeData({
        to,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: input.xpub, opReturnData },
        sendMax: false,
      })

      return Ok({
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      })
    }

    if (transactionData.type === 'evm' && input.sendAddress && 'supportsEIP1559' in input) {
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter: assertGetEvmChainAdapter(sellAsset.chainId),
        transactionData,
        from: input.sendAddress,
        supportsEIP1559: input.supportsEIP1559,
        gasLimitBuffer: 1.2,
      })

      return Ok({ networkFeeCryptoBaseUnit })
    }

    if (transactionData.type === 'tron' && input.sendAddress) {
      const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

      const { fast } = await assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to: toTronBase58(transactionData.to),
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { from: input.sendAddress, contractAddress },
      })

      return Ok({ networkFeeCryptoBaseUnit: fast.txFee })
    }

    throw new Error('[BobGateway] invalid quote')
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to estimate network fee',
        code: TradeQuoteError.NetworkFeeEstimationFailed,
        cause: err,
      }),
    )
  }
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
  const maybeOrder = await createBobGatewayOrder(
    deps.config,
    quote,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )
  if (maybeOrder.isErr()) return Err(maybeOrder.unwrapErr())

  const { orderId, transactionData } = maybeOrder.unwrap()

  const maybeFeeData = await getBobGatewayQuoteFeeData(input, deps, transactionData)
  if (maybeFeeData.isErr()) return Err(maybeFeeData.unwrapErr())

  return Ok({ orderId, transactionData, feeData: maybeFeeData.unwrap() })
}
