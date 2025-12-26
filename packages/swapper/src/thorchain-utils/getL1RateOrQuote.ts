import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import {
  assertUnreachable,
  bn,
  bnOrZero,
  contractAddressOrUndefined,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  fromBaseUnit,
  isFulfilled,
  isRejected,
  toBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { TronWeb } from 'tronweb'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../index'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  ProtocolFee,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../types'
import { TradeQuoteError } from '../types'
import { getInputOutputRate, makeSwapErrorRight } from '../utils'
import * as evm from './evm'
import { getLimitWithManualSlippage } from './getLimitWithManualSlippage/getLimitWithManualSlippage'
import { getQuote } from './getQuote'
import {
  addLimitToMemo,
  assertAndProcessMemo,
  getAffiliate,
  getNativePrecision,
  getSwapSource,
} from './index'
import * as tron from './tron'
import type {
  ThorEvmTradeQuote,
  ThorEvmTradeRate,
  ThornodeQuoteResponseSuccess,
  ThorTradeQuote,
  ThorTradeRate,
  ThorTradeRoute,
  ThorTradeUtxoOrCosmosQuote,
  ThorTradeUtxoOrCosmosRate,
  TradeType,
} from './types'
import * as utxo from './utxo'

const SAFE_GAS_LIMIT = '100000' // depositWithExpiry()

type ThorTradeRateOrQuote = ThorTradeRate | ThorTradeQuote
type ThorEvmTradeRateOrQuote = ThorEvmTradeRate | ThorEvmTradeQuote
type ThorUtxoOrCosmosTradeRateOrQuote = ThorTradeUtxoOrCosmosRate | ThorTradeUtxoOrCosmosQuote

type MakeThorTradeInputBase = {
  route: ThorTradeRoute
  memo: string
  allowanceContract: string
  feeData: QuoteFeeData
}

type MakeThorTradeInput<T extends ThorTradeRateOrQuote> = T extends ThorEvmTradeRateOrQuote
  ? MakeThorTradeInputBase & {
      data: string
      router: string
      vault: string
    }
  : MakeThorTradeInputBase & {
      data?: never
      router?: never
      vault?: never
    }

export const getL1RateOrQuote = async <T extends ThorTradeRateOrQuote>(
  input: T extends ThorTradeRate ? GetTradeRateInput : CommonTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
  swapperName: SwapperName,
): Promise<Result<T[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
  } = input

  const {
    config,
    assertGetEvmChainAdapter,
    assertGetUtxoChainAdapter,
    assertGetCosmosSdkChainAdapter,
  } = deps

  // "NativePrecision" is intended to indicate the base unit precision of the asset
  // for the corresponding swapper network (THORChain or MAYAChain)
  // (CACAO = 10, everything else = 8)
  const sellAssetNativePrecision = getNativePrecision(sellAsset.assetId, swapperName)
  const buyAssetNativePrecision = getNativePrecision(buyAsset.assetId, swapperName)

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(swapperName)

  const inputSlippageBps = convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)

  const baseQuoteArgs = {
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
    swapperName,
  }

  const maybeSwapQuote = await getQuote({ ...baseQuoteArgs, streaming: false }, deps)

  const maybeStreamingSwapQuote = await getQuote(
    { ...baseQuoteArgs, streaming: true, streamingInterval },
    deps,
  )

  if (maybeSwapQuote.isErr() && maybeStreamingSwapQuote.isErr()) {
    return Err(maybeSwapQuote.unwrapErr())
  }

  const swapQuote = maybeSwapQuote.isOk() ? maybeSwapQuote.unwrap() : undefined

  const streamingSwapQuote = maybeStreamingSwapQuote.isOk()
    ? maybeStreamingSwapQuote.unwrap()
    : undefined

  const getRouteValues = (
    quote: ThornodeQuoteResponseSuccess,
    isStreaming: boolean,
  ): ThorTradeRoute => {
    const source = getSwapSource(tradeType, isStreaming, swapperName)

    return {
      source,
      quote,
      expectedAmountOutThorBaseUnit: bnOrZero(quote.expected_amount_out).toFixed(),
      isStreaming,
      affiliateBps: quote.fees.affiliate === '0' ? '0' : requestedAffiliateBps,
      // always use auto stream slippage limit (0 limit = 5bps - 50bps, sometimes up to 100bps)
      // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
      slippageBps: isStreaming ? bn(0) : inputSlippageBps,
      estimatedExecutionTimeMs: quote.total_swap_seconds
        ? 1000 * quote.total_swap_seconds
        : undefined,
    }
  }

  const perRouteValues: ThorTradeRoute[] = []

  if (swapQuote) perRouteValues.push(getRouteValues(swapQuote, false))
  if (streamingSwapQuote) perRouteValues.push(getRouteValues(streamingSwapQuote, true))

  const recommendedMinAmountIn =
    swapQuote?.recommended_min_amount_in ?? streamingSwapQuote?.recommended_min_amount_in

  // recommended_min_amount_in should be the same value for both types of swaps
  const recommendedMinimumCryptoBaseUnit = recommendedMinAmountIn
    ? convertPrecision({
        value: recommendedMinAmountIn,
        inputExponent: sellAssetNativePrecision,
        outputExponent: sellAsset.precision,
      }).toFixed()
    : '0'

  const getRouteBuyAmountBeforeFeesCryptoBaseUnit = (quote: ThornodeQuoteResponseSuccess) => {
    const buyAmountBeforeFeesCryptoThorPrecision = bn(quote.expected_amount_out).plus(
      quote.fees.total,
    )
    return toBaseUnit(
      fromBaseUnit(buyAmountBeforeFeesCryptoThorPrecision, buyAssetNativePrecision),
      buyAsset.precision,
    )
  }

  const getProtocolFees = (quote: ThornodeQuoteResponseSuccess) => {
    // Fees consist of liquidity, outbound, and affiliate fees
    // For the purpose of displaying protocol fees to the user, we don't need the latter
    // The reason for that is the affiliate fee is shown as its own "ShapeShift fee" section
    // Including the affiliate fee here would result in the protocol fee being wrong, as affiliate fees would be
    // double accounted for both in protocol fees, and affiliate fee
    const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(quote.fees.total).minus(
      quote.fees.affiliate,
    )

    const buyAssetTradeFeeBuyAssetCryptoBaseUnit = convertPrecision({
      value: buyAssetTradeFeeBuyAssetCryptoThorPrecision,
      inputExponent: buyAssetNativePrecision,
      outputExponent: buyAsset.precision,
    })

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    if (!buyAssetTradeFeeBuyAssetCryptoBaseUnit.isZero()) {
      protocolFees[buyAsset.assetId] = {
        amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toString(),
        requiresBalance: false,
        asset: buyAsset,
      }
    }

    return protocolFees
  }

  const getMemo = (route: ThorTradeRoute) => {
    if (input.quoteOrRate === 'rate') return ''

    if (!route.quote.memo) throw new Error('no memo provided')

    // always use auto stream quote memo (0 limit = 5bps - 50bps, sometimes up to 100bps)
    // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
    if (route.isStreaming) return assertAndProcessMemo(route.quote.memo, getAffiliate(swapperName))

    const limitWithManualSlippage = getLimitWithManualSlippage({
      expectedAmountOutThorBaseUnit: route.expectedAmountOutThorBaseUnit,
      slippageBps: route.slippageBps,
    })

    return addLimitToMemo({
      memo: route.quote.memo,
      limit: limitWithManualSlippage,
      affilate: getAffiliate(swapperName),
    })
  }

  const makeThorTradeRateOrQuote = <U extends ThorTradeRateOrQuote>({
    route,
    memo,
    allowanceContract,
    feeData,
    data,
    router,
    vault,
  }: MakeThorTradeInput<U>): T => {
    const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
      value: route.expectedAmountOutThorBaseUnit,
      inputExponent: buyAssetNativePrecision,
      outputExponent: buyAsset.precision,
    }).toFixed()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })
    const slippage = route.isStreaming ? undefined : slippageTolerancePercentageDecimal
    const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmountBeforeFeesCryptoBaseUnit(route.quote)

    return {
      id: uuid(),
      quoteOrRate: input.quoteOrRate,
      memo,
      receiveAddress,
      affiliateBps: route.affiliateBps,
      isStreaming: route.isStreaming,
      recommendedMinimumCryptoBaseUnit,
      slippageTolerancePercentageDecimal: slippage,
      rate,
      data,
      router,
      vault,
      expiry: route.quote.expiry,
      tradeType,
      swapperName,
      steps: [
        {
          estimatedExecutionTimeMs: route.estimatedExecutionTimeMs,
          rate,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          source: route.source,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract,
          feeData,
          thorchainSpecific: {
            maxStreamingQuantity: route.quote.max_streaming_quantity,
          },
        },
      ],
    } as T
  }

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const { supportsEIP1559 } = input as GetEvmTradeRateInput | GetEvmTradeQuoteInput

      const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(async (route): Promise<T> => {
          const memo = getMemo(route)

          const { data, router, vault } = await evm.getThorTxData({
            sellAsset,
            sellAmountCryptoBaseUnit,
            memo,
            expiry: route.quote.expiry,
            config,
            swapperName,
          })

          const { average } = await adapter.getGasFeeData()

          const networkFeeCryptoBaseUnit = adapters.evm.calcNetworkFeeCryptoBaseUnit({
            ...average,
            supportsEIP1559,
            gasLimit: SAFE_GAS_LIMIT,
          })

          return makeThorTradeRateOrQuote<ThorEvmTradeRateOrQuote>({
            route,
            memo,
            allowanceContract: router,
            data,
            router,
            vault,
            feeData: {
              protocolFees: getProtocolFees(route.quote),
              networkFeeCryptoBaseUnit,
            },
          })
        }),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      return Ok(routes)
    }
    case CHAIN_NAMESPACE.Utxo: {
      const { xpub = '' } = input as GetUtxoTradeRateInput

      const sellAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)

      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(async (route): Promise<T> => {
          const memo = getMemo(route)

          const { vault } = await utxo.getThorTxData({ sellAsset, config, swapperName })

          const feeData = await (async (): Promise<QuoteFeeData> => {
            const protocolFees = getProtocolFees(route.quote)

            // This is a rate without a wallet connected, so we can't get fees
            if (!xpub) return { networkFeeCryptoBaseUnit: undefined, protocolFees }

            const { fast } = await sellAdapter.getFeeData({
              to: vault,
              value: sellAmountCryptoBaseUnit,
              chainSpecific: { pubkey: xpub, opReturnData: memo },
            })

            return {
              networkFeeCryptoBaseUnit: fast.txFee,
              protocolFees,
              chainSpecific: {
                satsPerByte: fast.chainSpecific.satoshiPerByte,
              },
            }
          })()

          return makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
            route,
            allowanceContract: '0x0', // not applicable to UTXOs
            memo,
            feeData,
          })
        }),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      return Ok(routes)
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      const cosmosChainAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

      const { fast } = await cosmosChainAdapter.getFeeData({})

      return Ok(
        perRouteValues.map((route): T => {
          return makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
            route,
            memo: getMemo(route),
            allowanceContract: '0x0', // not applicable to cosmossdk
            feeData: {
              networkFeeCryptoBaseUnit: fast.txFee,
              protocolFees: getProtocolFees(route.quote),
              chainSpecific: {
                estimatedGasCryptoBaseUnit: fast.chainSpecific.gasLimit,
              },
            },
          })
        }),
      )
    }
    case CHAIN_NAMESPACE.Solana: {
      return Err(
        makeSwapErrorRight({
          message: 'Solana is not supported',
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    case CHAIN_NAMESPACE.Tron: {
      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(async (route): Promise<T> => {
          const memo = getMemo(route)
          let networkFeeCryptoBaseUnit: string | undefined = undefined

          // Calculate fees for rates when we have a receive address (wallet connected)
          if (input.quoteOrRate === 'rate' && input.receiveAddress) {
            try {
              const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
              const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

              // Get vault address
              const { vault } = await tron.getThorTxData({ sellAsset, config, swapperName })

              // Estimate fees using the receive address for accurate energy calculation
              const tronWeb = new TronWeb({ fullHost: deps.config.VITE_TRON_NODE_URL })
              const params = await tronWeb.trx.getChainParameters()
              const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
              const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 100

              let totalFee = 0

              if (contractAddress) {
                // TRC20: Estimate energy with actual recipient
                try {
                  const result = await tronWeb.transactionBuilder.triggerConstantContract(
                    contractAddress,
                    'transfer(address,uint256)',
                    {},
                    [
                      { type: 'address', value: vault }, // Use vault as recipient
                      { type: 'uint256', value: sellAmountIncludingProtocolFeesCryptoBaseUnit },
                    ],
                    input.receiveAddress, // Use user's address as sender for estimation
                  )

                  const energyUsed = result.energy_used ?? 65000
                  const energyFee = energyUsed * energyPrice * 1.5 // 1.5x safety margin
                  const bandwidthFee = 276 * bandwidthPrice // TRC20 bandwidth
                  totalFee = Math.ceil(energyFee + bandwidthFee)
                } catch {
                  // Fallback: Conservative estimate
                  totalFee = 13_000_000 // 13 TRX worst case
                }
              } else {
                // TRX transfer bandwidth: Base tx + memo bytes
                const baseBytes = 198
                const memoBytes = route.quote.memo
                  ? Buffer.from(route.quote.memo, 'utf8').length
                  : 0
                const totalBandwidth = baseBytes + memoBytes
                totalFee = totalBandwidth * bandwidthPrice
              }

              networkFeeCryptoBaseUnit = String(totalFee)
            } catch {
              // Leave as undefined if estimation fails
            }
          }
          // For quotes, fees will be calculated in getTronTransactionFees when executing

          return Promise.resolve(
            makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
              route,
              allowanceContract: '0x0', // not applicable to TRON
              memo,
              feeData: {
                networkFeeCryptoBaseUnit,
                protocolFees: getProtocolFees(route.quote),
              },
            }),
          )
        }),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      return Ok(routes)
    }
    case CHAIN_NAMESPACE.Sui: {
      return Err(
        makeSwapErrorRight({
          message: 'SUI is not supported',
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    case CHAIN_NAMESPACE.Starknet: {
      return Err(
        makeSwapErrorRight({
          message: 'Starknet is not supported',
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    default:
      return assertUnreachable(chainNamespace)
  }
}
