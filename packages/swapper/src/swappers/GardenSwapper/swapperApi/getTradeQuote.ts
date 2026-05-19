import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { bnOrZero, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Hex } from 'viem'
import { fromHex } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { GARDEN_AFFILIATE_FEE_ASSET, GARDEN_AFFILIATE_FEE_RECIPIENT } from '../constants'
import type { GardenCreateOrderResult, GardenSpecificMetadata, GardenStarknetCall } from '../types'
import { isGardenBitcoinInitiate, isGardenEvmInitiate, isGardenStarknetInitiate } from '../types'
import {
  buildGardenAffiliateFees,
  createGardenOrder,
  fetchGardenQuote,
  getGardenAssetInfo,
} from '../utils/fetchFromGarden'
import { assetIdToGardenAssetId, isSupportedGardenPair } from '../utils/helpers/helpers'

const parseGardenEvmValue = (value: string): string => {
  if (value.startsWith('0x')) return fromHex(value as Hex, 'bigint').toString()
  if (/^\d+$/.test(value)) return BigInt(value).toString()
  throw new Error(`Garden EVM initiate value has unexpected format: ${JSON.stringify(value)}`)
}

const buildGardenSpecific = (order: GardenCreateOrderResult): GardenSpecificMetadata => {
  const base = { orderId: order.order_id }
  if (isGardenBitcoinInitiate(order)) return { ...base, bitcoinDepositAddress: order.to }
  if (isGardenStarknetInitiate(order)) {
    const starknetCalls = [order.approval_transaction, order.initiate_transaction].filter(
      (call): call is GardenStarknetCall => call !== null,
    )
    return {
      ...base,
      starknetCalls,
    }
  }
  if (isGardenEvmInitiate(order)) {
    return {
      ...base,
      evmInitiate: {
        to: order.initiate_transaction.to,
        data: order.initiate_transaction.data,
        value: parseGardenEvmValue(order.initiate_transaction.value),
        allowanceContract: order.initiate_transaction.to,
      },
    }
  }
  return base
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  if (!isSupportedGardenPair(sellAsset.assetId, buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `Garden does not support ${sellAsset.symbol} → ${buyAsset.symbol}`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'accountNumber is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (sendAddress === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (receiveAddress === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'receiveAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const apiKey = deps.config.VITE_GARDEN_API_KEY
  if (!apiKey) {
    return Err(
      makeSwapErrorRight({
        message: 'VITE_GARDEN_API_KEY is not configured',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const fromGardenAsset = assetIdToGardenAssetId(sellAsset.assetId)
  const toGardenAsset = assetIdToGardenAssetId(buyAsset.assetId)
  if (!fromGardenAsset || !toGardenAsset) {
    return Err(
      makeSwapErrorRight({
        message: 'Asset not supported by Garden',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sourceAssetInfoResult = await getGardenAssetInfo({ apiKey, gardenAssetId: fromGardenAsset })
  if (sourceAssetInfoResult.isErr()) return Err(sourceAssetInfoResult.unwrapErr())
  const sourceAssetInfo = sourceAssetInfoResult.unwrap()

  if (sourceAssetInfo) {
    if (bnOrZero(sellAmount).lt(sourceAssetInfo.min_amount)) {
      return Err(
        makeSwapErrorRight({
          message: 'Sell amount below Garden minimum',
          code: TradeQuoteError.SellAmountBelowMinimum,
          details: {
            minAmountCryptoBaseUnit: sourceAssetInfo.min_amount,
            assetId: sellAsset.assetId,
          },
        }),
      )
    }
    if (bnOrZero(sellAmount).gt(sourceAssetInfo.max_amount)) {
      return Err(
        makeSwapErrorRight({
          message: 'Sell amount above Garden maximum',
          code: TradeQuoteError.NoRouteFound,
          details: { maxAmountCryptoBaseUnit: sourceAssetInfo.max_amount },
        }),
      )
    }
  }

  const quoteResult = await fetchGardenQuote({
    apiKey,
    from: fromGardenAsset,
    to: toGardenAsset,
    fromAmount: sellAmount,
    affiliateBps,
  })

  if (quoteResult.isErr()) return Err(quoteResult.unwrapErr())
  const quote = quoteResult.unwrap()

  const orderResult = await createGardenOrder({
    apiKey,
    request: {
      source: { asset: fromGardenAsset, owner: sendAddress, amount: sellAmount },
      destination: {
        asset: toGardenAsset,
        owner: receiveAddress,
        amount: quote.destination.amount,
      },
      solver_id: quote.solver_id,
      affiliate_fees: buildGardenAffiliateFees({
        affiliateBps,
        asset: GARDEN_AFFILIATE_FEE_ASSET,
        address: GARDEN_AFFILIATE_FEE_RECIPIENT,
      }),
    },
  })

  if (orderResult.isErr()) return Err(orderResult.unwrapErr())
  const order = orderResult.unwrap()

  let gardenSpecific: GardenSpecificMetadata
  try {
    gardenSpecific = buildGardenSpecific(order)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Garden order payload failed to parse',
        code: TradeQuoteError.InvalidResponse,
        details: { error: error instanceof Error ? error.message : String(error) },
      }),
    )
  }

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  type FeeDataResult = {
    networkFeeCryptoBaseUnit: string | undefined
    chainSpecific?: { satsPerByte: string }
  }

  const feeData: FeeDataResult = await (async (): Promise<FeeDataResult> => {
    try {
      if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        const pubkey = (input as GetUtxoTradeQuoteInput).xpub
        if (!pubkey || !gardenSpecific.bitcoinDepositAddress) {
          return { networkFeeCryptoBaseUnit: undefined }
        }
        const utxoFee = await adapter.getFeeData({
          to: gardenSpecific.bitcoinDepositAddress,
          value: sellAmount,
          chainSpecific: { pubkey },
          sendMax: false,
        })
        return {
          networkFeeCryptoBaseUnit: utxoFee.fast.txFee,
          chainSpecific: { satsPerByte: utxoFee.fast.chainSpecific.satoshiPerByte },
        }
      }

      if (chainNamespace === CHAIN_NAMESPACE.Starknet) {
        const adapter = deps.assertGetStarknetChainAdapter(sellAsset.chainId)
        const tokenContractAddress = contractAddressOrUndefined(sellAsset.assetId)
        const starknetFee = await adapter.getFeeData({
          to: gardenSpecific.starknetCalls?.[1]?.to ?? sendAddress,
          value: sellAmount,
          chainSpecific: { from: sendAddress, tokenContractAddress },
          sendMax: false,
        })
        return { networkFeeCryptoBaseUnit: starknetFee.fast.txFee }
      }

      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        if (!gardenSpecific.evmInitiate) return { networkFeeCryptoBaseUnit: undefined }
        const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)
        const evmFee = await evm.getFees({
          adapter,
          data: gardenSpecific.evmInitiate.data,
          to: gardenSpecific.evmInitiate.to,
          value: gardenSpecific.evmInitiate.value,
          from: sendAddress,
          supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
        })
        return { networkFeeCryptoBaseUnit: evmFee.networkFeeCryptoBaseUnit }
      }

      return { networkFeeCryptoBaseUnit: undefined }
    } catch {
      return { networkFeeCryptoBaseUnit: undefined }
    }
  })()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.source.amount,
    buyAmountCryptoBaseUnit: quote.destination.amount,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = gardenSpecific.evmInitiate?.allowanceContract ?? '0x0'

  const tradeQuote: TradeQuote = {
    id: uuid(),
    receiveAddress,
    affiliateBps,
    rate,
    slippageTolerancePercentageDecimal:
      slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Garden),
    quoteOrRate: 'quote' as const,
    swapperName: SwapperName.Garden,
    steps: [
      {
        accountNumber,
        allowanceContract,
        buyAmountBeforeFeesCryptoBaseUnit: quote.destination.amount,
        buyAmountAfterFeesCryptoBaseUnit: quote.destination.amount,
        buyAsset,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit: feeData.networkFeeCryptoBaseUnit,
          ...(feeData.chainSpecific && { chainSpecific: feeData.chainSpecific }),
        },
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: quote.source.amount,
          buyAmountCryptoBaseUnit: quote.destination.amount,
        }),
        rate,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.source.amount,
        sellAsset,
        source: SwapperName.Garden,
        estimatedExecutionTimeMs: quote.estimated_time * 1000,
        gardenSpecific,
      },
    ],
  }

  return Ok([tradeQuote])
}
