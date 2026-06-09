import type {
  GatewayOrderStatusV2,
  GatewayQuoteV2,
  GetQuoteParams,
  RegisterTxV2,
} from '@gobob/bob-sdk'
import { GatewayErrorCode, GatewaySDK, isGatewayError } from '@gobob/bob-sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bobChainId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
import type {
  GetTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  SwapperConfig,
  SwapperDeps,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { BobGatewayMetadata } from '../types'
import type { BobGatewayChainName } from './constants'
import {
  BOB_GATEWAY_BASE_URL,
  BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT,
  BOB_GATEWAY_ONRAMP_DEFAULT_TX_VSIZE,
  BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT,
  bobGatewayChainNameToChainId,
  chainIdToBobGatewayChainName,
  decimalSlippageToBobBps,
} from './constants'

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

  // TODO: affiliate fees are to be paid out on ethChainId, but that address must first be
  // whitelisted with BOB Gateway. Until then use BOB EOA.
  const affiliateAddress = getTreasuryAddressFromChainId(bobChainId)

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
  sender: string
  recipient: string
  amount: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
}): Promise<Result<GatewayQuoteV2, SwapErrorRight>> => {
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

export const createBobGatewayOrderMetadata = async (
  config: SwapperConfig,
  gatewayQuote: GatewayQuoteV2,
): Promise<Result<BobGatewayMetadata, SwapErrorRight>> => {
  try {
    const orderResponse = await getBobGatewayClient(config).api.createOrderV2({
      gatewayQuoteV2: gatewayQuote,
    })

    // onramp (BTC→EVM)
    if ('onramp' in orderResponse) {
      return Ok({
        orderId: orderResponse.onramp.orderId,
        utxoTx: {
          depositAddress: orderResponse.onramp.address,
          opReturnData: orderResponse.onramp.opReturnData ?? undefined,
        },
      })
    }

    // offramp (EVM→BTC) and tokenSwap (EVM→EVM) orders share the same tx shape
    const order = 'offramp' in orderResponse ? orderResponse.offramp : orderResponse.tokenSwap
    return Ok({
      orderId: order.orderId,
      evmTx: {
        to: order.tx.to,
        data: order.tx.data,
        value: order.tx.value,
        chain: order.tx.chain,
      },
    })
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
  const registerTxV2: RegisterTxV2 = (() => {
    // BTC→EVM
    if (chainIdToBobGatewayChainName[sellAsset.chainId] === 'bitcoin') {
      return { onramp: { orderId, bitcoinTxid: txHash } }
    }

    // EVM→BTC
    if (chainIdToBobGatewayChainName[buyAsset.chainId] === 'bitcoin') {
      return { offramp: { orderId, evmTxhash: txHash } }
    }

    // EVM→EVM
    return { tokenSwap: { orderId, evmTxhash: txHash } }
  })()

  await getBobGatewayClient(config).api.registerTxV2({ registerTxV2 })
}

export const getBobGatewayQuoteFeeData = async (
  input: GetTradeQuoteInput,
  { assertGetUtxoChainAdapter, assertGetEvmChainAdapter }: SwapperDeps,
  orderMetadata: BobGatewayMetadata,
): Promise<Result<Omit<QuoteFeeData, 'protocolFees'>, SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  try {
    if (orderMetadata.utxoTx && 'xpub' in input) {
      const { depositAddress, opReturnData } = orderMetadata.utxoTx

      const { fast } = await assertGetUtxoChainAdapter(sellAsset.chainId).getFeeData({
        to: depositAddress,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: input.xpub, opReturnData },
        sendMax: false,
      })

      return Ok({
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      })
    }

    if (orderMetadata.evmTx && input.sendAddress && 'supportsEIP1559' in input) {
      const { to, data, value } = orderMetadata.evmTx

      const { networkFeeCryptoBaseUnit } = await evm.getFees({
        adapter: assertGetEvmChainAdapter(sellAsset.chainId),
        to,
        data,
        value,
        from: input.sendAddress,
        supportsEIP1559: input.supportsEIP1559,
      })

      return Ok({ networkFeeCryptoBaseUnit })
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

export const getBobGatewayRateNetworkFeeCryptoBaseUnit = async (
  quote: GatewayQuoteV2,
  sellAsset: Asset,
  { assertGetEvmChainAdapter, assertGetUtxoChainAdapter }: SwapperDeps,
): Promise<string | undefined> => {
  try {
    if ('onramp' in quote) {
      const { fast } = await assertGetUtxoChainAdapter(
        sellAsset.chainId,
      ).httpProvider.getNetworkFees()

      if (!fast?.satsPerKiloByte) return undefined
      const satsPerByte = Math.max(1, Math.ceil(fast.satsPerKiloByte / 1000))

      return bnOrZero(satsPerByte).times(BOB_GATEWAY_ONRAMP_DEFAULT_TX_VSIZE).toFixed(0)
    }

    const defaultGasLimit =
      'offramp' in quote
        ? BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT
        : BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT

    const { average } = await assertGetEvmChainAdapter(sellAsset.chainId).getGasFeeData()
    const feePerGas = bnOrZero(average.maxFeePerGas).gt(0) ? average.maxFeePerGas : average.gasPrice

    return bnOrZero(defaultGasLimit).times(bnOrZero(feePerGas)).toFixed(0)
  } catch {
    return undefined
  }
}

export const mapBobGatewayOrderStatusToTxStatus = (status: GatewayOrderStatusV2): TxStatus => {
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

  return toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: fee.address,
  })
}

export const parseBobGatewayQuote = (
  quote: GatewayQuoteV2,
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

export const getBobGatewayAllowanceContract = (quote: GatewayQuoteV2, sellAsset: Asset): string => {
  if (!isEvmChainId(sellAsset.chainId)) return ''
  if (!contractAddressOrUndefined(sellAsset.assetId)) return ''
  if ('offramp' in quote) return quote.offramp.txTo
  if ('tokenSwap' in quote) return quote.tokenSwap.txTo
  return ''
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
