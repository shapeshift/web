import type { GatewayOrderStatusV3, GatewayQuoteV4, GetQuoteParams } from '@gobob/bob-sdk'
import { GatewayErrorCode, GatewaySDK, isGatewayError } from '@gobob/bob-sdk'
import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  btcChainId,
  ethChainId,
  fromAssetId,
  toAssetId,
  tronChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId, tron } from '@shapeshiftoss/chain-adapters'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import {
  bnOrZero,
  chainIdToFeeAssetId,
  contractAddressOrUndefined,
  isToken,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress, zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { QuoteFeeData, SwapErrorRight, SwapperConfig } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import { TRON_PLACEHOLDER_ADDRESS } from '../../../utils/tron'
import type { BobGatewayChainName } from './constants'
import {
  BOB_GATEWAY_BASE_URL,
  bobGatewayChainNameToChainId,
  chainIdToBobGatewayChainName,
  decimalSlippageToBobBps,
  DUMMY_BTC_ADDRESS,
  DUMMY_EVM_ADDRESS,
} from './constants'

export const dummyAddressForChainId = (chainId: ChainId): string => {
  if (chainId === btcChainId) return DUMMY_BTC_ADDRESS
  if (chainId === tronChainId) return TRON_PLACEHOLDER_ADDRESS
  return DUMMY_EVM_ADDRESS
}

export const getBobGatewayClient = (config: SwapperConfig): GatewaySDK => {
  return new GatewaySDK({ basePath: BOB_GATEWAY_BASE_URL, apiKey: config.VITE_BOB_GATEWAY_API_KEY })
}

export const assetIdToBobGatewayToken = (assetId: string): string => {
  // BOB Gateway uses the zero address as the token address for native assets
  if (!isToken(assetId)) return zeroAddress
  return fromAssetId(assetId).assetReference
}

export const getBobGatewayAffiliates = (affiliateBps: string): GetQuoteParams['affiliates'] => {
  const bps = bnOrZero(affiliateBps)
  if (!bps.isFinite() || bps.lte(0)) return undefined

  const affiliateAddress = getTreasuryAddressFromChainId(ethChainId)

  return [{ address: getAddress(affiliateAddress), bps: bps.toNumber() }]
}

export const getBobGatewayQuote = async ({
  config,
  sellAsset,
  buyAsset,
  sellChainName,
  buyChainName,
  sender,
  recipient,
  refundAddress,
  amount,
  affiliateBps,
  slippageTolerancePercentageDecimal,
}: {
  config: SwapperConfig
  sellAsset: Asset
  buyAsset: Asset
  sellChainName: BobGatewayChainName
  buyChainName: BobGatewayChainName
  sender: string | undefined
  recipient: string
  refundAddress: string | undefined
  amount: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
}): Promise<Result<GatewayQuoteV4, SwapErrorRight>> => {
  const slippage = decimalSlippageToBobBps(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.BobGateway),
  )

  try {
    const quote = await getBobGatewayClient(config).getQuote({
      fromChain: sellChainName,
      toChain: buyChainName,
      fromToken: assetIdToBobGatewayToken(sellAsset.assetId),
      toToken: assetIdToBobGatewayToken(buyAsset.assetId),
      fromUserAddress: sender,
      toUserAddress: recipient,
      amount,
      maxSlippage: Number(slippage),
      refundAddress,
      affiliates: getBobGatewayAffiliates(affiliateBps),
    })

    return Ok(quote)
  } catch (err) {
    if (isGatewayError(err)) {
      switch (err.code) {
        case GatewayErrorCode.QuoteAmountTooLow:
          return Err(
            createTradeAmountTooSmallErr({
              minAmountCryptoBaseUnit: err.details.minimum,
              assetId: sellAsset.assetId,
            }),
          )
        case GatewayErrorCode.UnableToCoverFees:
          return Err(
            makeSwapErrorRight({
              message: '[BobGateway] sell amount does not cover fees',
              code: TradeQuoteError.SellAmountBelowTradeFee,
              cause: err,
            }),
          )
        case GatewayErrorCode.NoRoute:
          return Err(
            makeSwapErrorRight({
              message: '[BobGateway] no route found for trade pair',
              code: TradeQuoteError.NoRouteFound,
              cause: err,
            }),
          )
        case GatewayErrorCode.DisabledChain:
          return Err(
            makeSwapErrorRight({
              message: '[BobGateway] trading is temporarily halted for this chain',
              code: TradeQuoteError.TradingHalted,
              cause: err,
            }),
          )
        default:
          break
      }
    }

    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to fetch quote',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}

export const createBobGatewayOrder = async (config: SwapperConfig, quote: GatewayQuoteV4) => {
  try {
    const order = await getBobGatewayClient(config).api.createOrderV4({ gatewayQuoteV4: quote })
    return Ok(order)
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

export const submitBobGatewayBtcDeposit = async ({
  config,
  orderId,
  bitcoinTxHex,
}: {
  config: SwapperConfig
  orderId: string
  bitcoinTxHex: string
}): Promise<string> => {
  await getBobGatewayClient(config).api.registerTxV4({
    registerTxV4: { onramp: { orderId, bitcoinTxHex } },
  })

  return bitcoin.Transaction.fromHex(bitcoinTxHex).getId()
}

export const mapBobGatewayOrderStatusToTxStatus = (status: GatewayOrderStatusV3): TxStatus => {
  if ('inProgress' in status) return TxStatus.Pending
  if ('success' in status) return TxStatus.Confirmed
  if ('failed' in status) return TxStatus.Failed
  if ('refunded' in status) return TxStatus.Failed
  return TxStatus.Unknown
}

const bobGatewayFeeToAssetId = (fee: { address: string; chain: string }): AssetId | undefined => {
  const chainId = bobGatewayChainNameToChainId[fee.chain as BobGatewayChainName]
  if (!chainId) return

  if (fee.address.toLowerCase() === zeroAddress) return chainIdToFeeAssetId(chainId)

  if (chainId === tronChainId) {
    return toAssetId({
      chainId,
      assetNamespace: ASSET_NAMESPACE.trc20,
      assetReference: tron.toTronBase58(fee.address),
    })
  }

  return toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: fee.address,
  })
}

export const parseBobGatewayQuote = (
  quote: GatewayQuoteV4,
  buyAsset: Asset,
  assetsById: AssetsByIdPartial,
) => {
  const { outputAmount, estimatedTimeInSecs, fees } = (() => {
    if ('onramp' in quote) {
      const { outputAmount, estimatedTimeInSecs, fees } = quote.onramp
      return { outputAmount, estimatedTimeInSecs, fees: [fees] }
    }

    if ('offramp' in quote) {
      const { outputAmount, estimatedTimeInSecs, feeBreakdown } = quote.offramp
      const { affiliateFee, inclusionFee, protocolFee, solverFee } = feeBreakdown

      return {
        outputAmount,
        estimatedTimeInSecs,
        fees: [affiliateFee, inclusionFee, protocolFee, solverFee],
      }
    }

    const { outputAmount, estimatedTimeInSecs, fees } = quote.tokenSwap
    return { outputAmount, estimatedTimeInSecs, fees: [fees] }
  })()

  const protocolFees = fees.reduce<NonNullable<QuoteFeeData['protocolFees']>>((acc, fee) => {
    const amountCryptoBaseUnit = bnOrZero(fee.amount)
    if (amountCryptoBaseUnit.lte(0)) return acc

    const assetId = bobGatewayFeeToAssetId(fee)
    if (!assetId) return acc

    const asset = assetId === buyAsset.assetId ? buyAsset : assetsById[assetId]
    if (!asset) return acc

    acc[assetId] = {
      amountCryptoBaseUnit: bnOrZero(acc[assetId]?.amountCryptoBaseUnit)
        .plus(amountCryptoBaseUnit)
        .toFixed(),
      asset,
      requiresBalance: false,
    }
    return acc
  }, {})

  // buyAmountBeforeFees is denominated in the buy asset, so only add back buy-asset-denominated fees
  const buyAssetFeeCryptoBaseUnit = bnOrZero(protocolFees[buyAsset.assetId]?.amountCryptoBaseUnit)

  return {
    buyAmountBeforeFeesCryptoBaseUnit: buyAssetFeeCryptoBaseUnit
      .plus(bnOrZero(outputAmount.amount))
      .toFixed(),
    buyAmountAfterFeesCryptoBaseUnit: outputAmount.amount,
    protocolFees,
    estimatedExecutionTimeMs:
      typeof estimatedTimeInSecs === 'number' ? estimatedTimeInSecs * 1000 : undefined,
  }
}

export const getBobGatewayAllowanceContract = (quote: GatewayQuoteV4, sellAsset: Asset): string => {
  const isTron = sellAsset.chainId === tronChainId
  if (!isEvmChainId(sellAsset.chainId) && !isTron) return ''
  if (!contractAddressOrUndefined(sellAsset.assetId)) return ''

  const txTo = (() => {
    if ('offramp' in quote) return quote.offramp.txTo
    if ('tokenSwap' in quote) return quote.tokenSwap.txTo
    return ''
  })()
  if (!txTo) return ''

  if (isTron) return tron.toTronBase58(txTo)
  return txTo
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<
  { sellChainName: BobGatewayChainName; buyChainName: BobGatewayChainName },
  SwapErrorRight
> => {
  const sellChainName = chainIdToBobGatewayChainName[sellAsset.chainId]
  const buyChainName = chainIdToBobGatewayChainName[buyAsset.chainId]

  if (!sellChainName) {
    return Err(
      makeSwapErrorRight({
        message: `[BobGateway] unsupported sell chain: ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!buyChainName) {
    return Err(
      makeSwapErrorRight({
        message: `[BobGateway] unsupported buy chain: ${buyAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  return Ok({ sellChainName, buyChainName })
}
