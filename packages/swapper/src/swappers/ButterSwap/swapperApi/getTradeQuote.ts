import { btcAssetId, btcChainId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  bnOrZero,
  chainIdToFeeAssetId,
  convertDecimalPercentageToBasisPoints,
  fromBaseUnit,
  toBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { makeButterSwapAffiliate } from '../utils/constants'
import {
  ButterSwapErrorCode,
  butterSwapErrorToTradeQuoteError,
  fetchTxData,
  getButterRoute,
  isBuildTxSuccess,
  isRouteSuccess,
} from '../xhr'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  _deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    sendAddress,
    slippageTolerancePercentageDecimal,
    accountNumber,
    affiliateBps,
  } = input

  if (
    !isEvmChainId(sellAsset.chainId) &&
    sellAsset.chainId !== btcChainId &&
    sellAsset.chainId !== solanaChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unsupported chain`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Yes, this is supposed to be supported as per checks above, but currently, Butter doesn't yield any quotes for BTC sells
  if (sellAsset.assetId === btcAssetId) {
    return Err(
      makeSwapErrorRight({
        message: `BTC sells are currently unsupported`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Yes, this is supposed to be supported as per checks above, but currently is explicitly disabled, this can be confirmed by hitting
  // Butter supported chains endpoit or trying to get a quote
  // Disabling this explicitly for the time being, since the PR that brings Solana support (https://github.com/shapeshift/web/pull/9840)
  // wasn't able to be tested yet
  if (sellAsset.chainId === solanaChainId) {
    return Err(
      makeSwapErrorRight({
        message: `Solana chain sells are currently unsupported`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Disable same-chain swaps for ButterSwap
  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `Same-chain swaps are not supported by ButterSwap`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] sendAddress is required for ButterSwap',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageDecimal =
    slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
  const slippage = convertDecimalPercentageToBasisPoints(slippageDecimal).toString()

  // Call ButterSwap /route API
  const routeResult = await getButterRoute({
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    ),
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps),
  })

  if (routeResult.isErr()) return Err(routeResult.unwrapErr())
  const routeResponse = routeResult.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    if (routeResponse.errno === ButterSwapErrorCode.InsufficientAmount) {
      const minAmountCryptoBaseUnit = toBaseUnit(
        (routeResponse as any).minAmount,
        sellAsset.precision,
      )
      return Err(
        createTradeAmountTooSmallErr({
          minAmountCryptoBaseUnit,
          assetId: sellAsset.assetId,
        }),
      )
    }
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] ${routeResponse.message}`,
        code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Call ButterSwap /swap API to get calldata and contract info
  const buildTxResult = await fetchTxData({
    hash: route.hash,
    slippage,
    from: sendAddress, // from (source chain address)
    receiver: receiveAddress, // receiver (destination chain address)
  })

  if (buildTxResult.isErr()) return Err(buildTxResult.unwrapErr())
  const buildTxResponse = buildTxResult.unwrap()
  if (!isBuildTxSuccess(buildTxResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] /swap failed: ${buildTxResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  const buildTx = buildTxResponse.data[0]
  if (!buildTx) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No buildTx data returned',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  // Fee asset for network fees
  const feeAsset = _deps.assetsById[chainIdToFeeAssetId(sellAsset.chainId)]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] Fee asset not found for chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Map gasFee.amount to networkFeeCryptoBaseUnit using fee asset precision
  const networkFeeCryptoBaseUnit = toBaseUnit(bnOrZero(route.gasFee?.amount), feeAsset.precision)

  // Use destination receive amount as a priority if present and defined
  // It won't for same-chain swaps, so we fall back to the source chain receive amount (i.e source chain *is* the destination chain)
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut

  // TODO: affiliate fees not yet here, gut feel is that Butter won't do the swap output - fees logic for us here
  // Sanity check me when affiliates are implemented, and do the math ourselves if needed
  const buyAmountAfterFeesCryptoBaseUnit = toBaseUnit(outputAmount, buyAsset.precision)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  // Extract Solana transaction metadata from versioned transaction, to allow building an unsigned Tx later on at getUnsignedSolanaTransaction time
  const solanaTransactionMetadata = (() => {
    if (sellAsset.chainId !== solanaChainId) return

    const txData = buildTx.data.startsWith('0x') ? buildTx.data.slice(2) : buildTx.data
    const versionedTransaction = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(txData, 'hex')),
    )

    // Decompile VersionedMessage to get instructions
    // https://dev.jup.ag/docs/old/additional-topics/composing-with-versioned-transaction
    const instructions = TransactionMessage.decompile(versionedTransaction.message).instructions

    // Extract address lookup table addresses
    const addressLookupTableAddresses = versionedTransaction.message.addressTableLookups?.map(
      lookup => lookup.accountKey.toString(),
    )

    return {
      instructions,
      addressLookupTableAddresses,
    }
  })()

  const step = {
    buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    buyAmountAfterFeesCryptoBaseUnit,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees: undefined,
    },
    rate,
    source: SwapperName.ButterSwap,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract: route.contract ?? '0x0',
    estimatedExecutionTimeMs: route.timeEstimated * 1000,
    butterSwapTransactionMetadata: {
      to: buildTx.to,
      data: buildTx.data,
      value: buildTx.value,
      gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
      ...(solanaTransactionMetadata && { solanaTransactionMetadata }),
    },
  }

  const tradeQuote: TradeQuote = {
    id: route.hash,
    rate,
    receiveAddress,
    affiliateBps,
    isStreaming: false,
    quoteOrRate: 'quote',
    swapperName: SwapperName.ButterSwap,
    slippageTolerancePercentageDecimal: slippageDecimal,
    steps: [step],
  }

  return Ok([tradeQuote])
}
