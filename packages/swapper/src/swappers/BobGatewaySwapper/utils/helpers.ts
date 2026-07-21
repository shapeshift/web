import type {
  GatewayOrderStatusV3,
  GatewayQuoteV3,
  GetQuoteParams,
  RegisterTxV3,
} from '@gobob/bob-sdk'
import { GatewayErrorCode, GatewaySDK, isGatewayError } from '@gobob/bob-sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  btcChainId,
  ethChainId,
  fromAssetId,
  toAssetId,
  tronChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
import { TronWeb } from 'tronweb'
import { getAddress, zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { QuoteFeeData, SwapErrorRight, SwapperConfig } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { BobGatewayChainName } from './constants'
import {
  BOB_GATEWAY_BASE_URL,
  bobGatewayChainNameToChainId,
  chainIdToBobGatewayChainName,
  decimalSlippageToBobBps,
  DUMMY_BTC_ADDRESS,
  DUMMY_EVM_ADDRESS,
  DUMMY_TRON_ADDRESS,
} from './constants'

export const dummyAddressForChainId = (chainId: ChainId): string => {
  if (chainId === btcChainId) return DUMMY_BTC_ADDRESS
  if (chainId === tronChainId) return DUMMY_TRON_ADDRESS
  return DUMMY_EVM_ADDRESS
}

export const getBobGatewayClient = (config: SwapperConfig): GatewaySDK => {
  return new GatewaySDK({ basePath: BOB_GATEWAY_BASE_URL, apiKey: config.VITE_BOB_GATEWAY_API_KEY })
}

export const toTronBase58 = (address: string): string => {
  if (address.startsWith('T')) return address
  if (address.startsWith('0x')) return TronWeb.address.fromHex(address.slice(2))
  return TronWeb.address.fromHex(address)
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
  amount: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
}): Promise<Result<GatewayQuoteV3, SwapErrorRight>> => {
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
      ownerAddress: sellChainName === 'bitcoin' ? recipient : (sender as string),
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

export const createBobGatewayOrder = async (config: SwapperConfig, quote: GatewayQuoteV3) => {
  try {
    const order = await getBobGatewayClient(config).api.createOrderV3({ gatewayQuoteV3: quote })
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

export const registerBobGatewayTx = async ({
  config,
  orderId,
  txHash,
  sellAsset,
  buyAsset,
}: {
  config: SwapperConfig
  orderId: string
  txHash: string
  sellAsset: Asset
  buyAsset: Asset
}): Promise<void> => {
  const registerTxV3: RegisterTxV3 = (() => {
    const sellChainName = chainIdToBobGatewayChainName[sellAsset.chainId]

    // BTC→EVM
    if (sellChainName === 'bitcoin') {
      return { onramp: { orderId, bitcoinTxid: txHash } }
    }

    // EVM→BTC
    if (chainIdToBobGatewayChainName[buyAsset.chainId] === 'bitcoin') {
      return { offramp: { orderId, srcChain: sellChainName, srcTxHash: txHash } }
    }

    // EVM→EVM
    return { tokenSwap: { orderId, srcChain: sellChainName, srcTxHash: txHash } }
  })()

  await getBobGatewayClient(config).api.registerTxV3({ registerTxV3 })
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
      assetReference: toTronBase58(fee.address),
    })
  }

  return toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: fee.address,
  })
}

export const parseBobGatewayQuote = (
  quote: GatewayQuoteV3,
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

export const getBobGatewayAllowanceContract = (quote: GatewayQuoteV3, sellAsset: Asset): string => {
  const isTron = sellAsset.chainId === tronChainId
  if (!isEvmChainId(sellAsset.chainId) && !isTron) return ''
  if (!contractAddressOrUndefined(sellAsset.assetId)) return ''

  const txTo = (() => {
    if ('offramp' in quote) return quote.offramp.txTo
    if ('tokenSwap' in quote) return quote.tokenSwap.txTo
    return ''
  })()
  if (!txTo) return ''

  if (isTron) return toTronBase58(txTo)
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
