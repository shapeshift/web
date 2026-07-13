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
import { TronWeb } from 'tronweb'
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
  BOB_GATEWAY_TRON_OFFRAMP_DEFAULT_BANDWIDTH,
  BOB_GATEWAY_TRON_OFFRAMP_DEFAULT_ENERGY,
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

// BobGateway ownerAddress (order lookup + refunds) is the sender - except BTC sells, which have none, so use the recipient.
export const getBobGatewayOwnerAddress = ({
  sellAsset,
  sender,
  recipient,
}: {
  sellAsset: Asset
  sender: string | undefined
  recipient: string
}): string => {
  const owner = sellAsset.chainId === btcChainId ? recipient : (sender as string)
  if (!TronWeb.isAddress(owner)) return owner
  // Converts a Tron address to its 20-byte EVM hex body (BobGateway ownerAddress format)
  return `0x${TronWeb.address.toHex(owner).slice(2)}`
}

export const getBobGatewayClient = (config: SwapperConfig): GatewaySDK => {
  return new GatewaySDK({ basePath: BOB_GATEWAY_BASE_URL, apiKey: config.VITE_BOB_GATEWAY_API_KEY })
}

// Normalizes an address to Tron base58: base58 passes through; a 0x-hex address is the 20-byte body
// under Tron's 0x41 prefix, so prepend it before decoding; a raw hex string decodes as-is.
export const toTronBase58 = (address: string): string => {
  if (address.startsWith('T')) return address
  if (address.startsWith('0x')) return TronWeb.address.fromHex(`41${address.slice(2)}`)
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
  ownerAddress,
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
  ownerAddress: string
  refundAddress?: string
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
      ownerAddress,
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

export const createBobGatewayOrderMetadata = async (
  config: SwapperConfig,
  gatewayQuote: GatewayQuoteV3,
): Promise<Result<BobGatewayMetadata, SwapErrorRight>> => {
  try {
    const orderResponse = await getBobGatewayClient(config).api.createOrderV3({
      gatewayQuoteV3: gatewayQuote,
    })

    // onramp (BTC→EVM/Tron)
    if ('onramp' in orderResponse) {
      return Ok({
        orderId: orderResponse.onramp.orderId,
        utxoTx: {
          depositAddress: orderResponse.onramp.address,
          opReturnData: orderResponse.onramp.opReturnData ?? undefined,
        },
      })
    }

    // offramp (EVM/Tron→BTC) and tokenSwap (EVM/Tron→EVM/Tron)
    const order = (() => {
      if ('offramp' in orderResponse) return orderResponse.offramp
      if ('tokenSwap' in orderResponse) return orderResponse.tokenSwap
    })()

    if (order) {
      const { tx, orderId } = order

      if (tx.type === 'evm') {
        return Ok({
          orderId,
          evmTx: { to: tx.to, data: tx.data, value: tx.value, chain: tx.chain },
        })
      }

      if (tx.type === 'tron') {
        return Ok({
          orderId,
          tronTx: {
            to: tx.to,
            data: tx.data,
            value: tx.value,
            feeLimit: tx.feeLimit,
            chain: tx.chain,
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

    // BTC→EVM/Tron
    if (sellChainName === 'bitcoin') {
      return { onramp: { orderId, bitcoinTxid: txHash } }
    }

    // EVM/Tron→BTC
    if (chainIdToBobGatewayChainName[buyAsset.chainId] === 'bitcoin') {
      return { offramp: { orderId, srcChain: sellChainName, srcTxHash: txHash } }
    }

    // EVM/Tron→EVM/Tron
    return { tokenSwap: { orderId, srcChain: sellChainName, srcTxHash: txHash } }
  })()

  await getBobGatewayClient(config).api.registerTxV3({ registerTxV3 })
}

export const getBobGatewayQuoteFeeData = async (
  input: GetTradeQuoteInput,
  { assertGetUtxoChainAdapter, assertGetEvmChainAdapter, assertGetTronChainAdapter }: SwapperDeps,
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

    if (orderMetadata.tronTx && input.sendAddress) {
      const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
      const { to, data, value } = orderMetadata.tronTx

      const { fast } = await assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to: toTronBase58(to),
        value,
        chainSpecific: { from: input.sendAddress, contractAddress, data },
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

export const getBobGatewayRateNetworkFeeCryptoBaseUnit = async (
  quote: GatewayQuoteV3,
  sellAsset: Asset,
  { assertGetEvmChainAdapter, assertGetUtxoChainAdapter, assertGetTronChainAdapter }: SwapperDeps,
): Promise<string | undefined> => {
  try {
    if ('onramp' in quote) {
      const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.httpProvider.getNetworkFees()

      if (!fast?.satsPerKiloByte) return undefined
      const satsPerByte = Math.max(1, Math.ceil(fast.satsPerKiloByte / 1000))

      return bnOrZero(satsPerByte).times(BOB_GATEWAY_ONRAMP_DEFAULT_TX_VSIZE).toFixed(0)
    }

    if (sellAsset.chainId === tronChainId) {
      const adapter = assertGetTronChainAdapter(sellAsset.chainId)

      const { energyPrice, bandwidthPrice } = await adapter.httpProvider.getChainPrices()

      return bnOrZero(BOB_GATEWAY_TRON_OFFRAMP_DEFAULT_ENERGY)
        .times(energyPrice)
        .plus(bnOrZero(BOB_GATEWAY_TRON_OFFRAMP_DEFAULT_BANDWIDTH).times(bandwidthPrice))
        .toFixed(0)
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
  })()

  if (!txTo) return ''

  return isTron ? toTronBase58(txTo) : txTo
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
