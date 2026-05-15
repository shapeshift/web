import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
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
import { GARDEN_AFFILIATE_FEE_ASSET, GARDEN_AFFILIATE_FEE_RECIPIENT } from '../constants'
import type { GardenSpecificMetadata } from '../types'
import { isGardenBitcoinInitiate, isGardenEvmInitiate, isGardenStarknetInitiate } from '../types'
import {
  buildGardenAffiliateFees,
  createGardenOrder,
  fetchGardenQuote,
} from '../utils/fetchFromGarden'
import { assetIdToGardenAssetId, isSupportedGardenPair } from '../utils/helpers/helpers'

const hexToDecimalString = (hex: string | undefined): string => {
  if (!hex) return '0'
  if (!hex.startsWith('0x')) return hex
  return fromHex(hex as Hex, 'bigint').toString()
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

  const gardenSpecific: GardenSpecificMetadata = {
    orderId: order.order_id,
    estimatedTimeMs: quote.estimated_time * 1000,
    ...(isGardenBitcoinInitiate(order) && { bitcoinDepositAddress: order.to }),
    ...(isGardenStarknetInitiate(order) && {
      starknetCalls: [order.approval_transaction, order.initiate_transaction],
    }),
    ...(isGardenEvmInitiate(order) && {
      evmInitiate: {
        to: order.initiate_transaction.to,
        data: order.initiate_transaction.data,
        value: hexToDecimalString(order.initiate_transaction.value),
        gasLimit: hexToDecimalString(order.initiate_transaction.gas_limit),
        allowanceContract: order.initiate_transaction.to,
      },
    }),
  }

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  type FeeDataResult = {
    networkFeeCryptoBaseUnit: string | undefined
    chainSpecific?: { satsPerByte: string }
  }

  const feeData: FeeDataResult = await (async (): Promise<FeeDataResult> => {
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
