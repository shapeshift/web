import { tronChainId } from '@shapeshiftoss/caip'
import { BigAmount, bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { TronWeb } from 'tronweb'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetTronTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import {
  buildSwapExactInputParameters,
  SUNIO_SWAP_EXACT_INPUT_SELECTOR,
} from './buildSwapContractCall'
import { buildSwapRouteParameters } from './buildSwapRouteParameters'
import {
  DEFAULT_SLIPPAGE_PERCENTAGE,
  SUNIO_FALLBACK_SWAP_ENERGY_NATIVE,
  SUNIO_FALLBACK_SWAP_ENERGY_TRC20,
  SUNIO_SMART_ROUTER_CONTRACT,
} from './constants'
import { fetchSunioQuote } from './fetchFromSunio'
import { isSupportedChainId } from './helpers/helpers'
import { sunioServiceFactory } from './sunioService'

export async function getQuoteOrRate(
  input: GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>>

export async function getQuoteOrRate(
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>>

export async function getQuoteOrRate(
  input: GetTradeRateInput | GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote | TradeRate, SwapErrorRight>> {
  try {
    const {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      receiveAddress,
      accountNumber,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    } = input

    const { assertGetTronChainAdapter: _assertGetTronChainAdapter } = deps

    if (!isSupportedChainId(sellAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Unsupported chainId: ${sellAsset.chainId}`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (sellAsset.chainId !== buyAsset.chainId) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Cross-chain not supported`,
          code: TradeQuoteError.CrossChainNotSupported,
        }),
      )
    }

    if (sellAsset.chainId !== tronChainId) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Only TRON chain supported`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
    }

    const service = sunioServiceFactory()
    const maybeQuoteResponse = await fetchSunioQuote(
      {
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
      service,
    )

    if (maybeQuoteResponse.isErr()) {
      return Err(maybeQuoteResponse.unwrapErr())
    }

    const quoteResponse = maybeQuoteResponse.unwrap()

    const bestRoute = quoteResponse.data[0]

    if (!bestRoute) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] No routes available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const isQuote = input.quoteOrRate === 'quote'

    // For quotes, receiveAddress is required
    if (isQuote && !receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] receiveAddress is required for quotes',
          code: TradeQuoteError.InternalError,
        }),
      )
    }

    // Estimate the network fee for both rates and quotes. We always produce a value: with an
    // address we simulate the real swap for accurate energy; without one (e.g. a rate preview
    // before a wallet is connected) we fall back to a conservative energy constant so the fee
    // is still realistic rather than missing.
    const networkFeeCryptoBaseUnit: string | undefined = await (async () => {
      try {
        const isSellingNativeTrx = !contractAddressOrUndefined(sellAsset.assetId)

        const tronWeb = new TronWeb({ fullHost: deps.config.VITE_TRON_NODE_URL })

        // Live network prices, defaulting if the node is unavailable so we still produce a fee
        const { bandwidthPrice, energyPrice } = await (async () => {
          try {
            const params = await tronWeb.trx.getChainParameters()
            return {
              bandwidthPrice: params.find(p => p.key === 'getTransactionFee')?.value ?? 1000,
              energyPrice: params.find(p => p.key === 'getEnergyFee')?.value ?? 100,
            }
          } catch {
            return { bandwidthPrice: 1000, energyPrice: 100 }
          }
        })()

        // Recipient activation can only be checked with an address
        const accountActivationFee = await (async () => {
          if (!receiveAddress) return 0
          try {
            const recipientInfoResponse = await fetch(
              `${deps.config.VITE_TRON_NODE_URL}/wallet/getaccount`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: receiveAddress, visible: true }),
              },
            )
            const recipientInfo = await recipientInfoResponse.json()
            const recipientExists = recipientInfo && Object.keys(recipientInfo).length > 1
            return recipientExists ? 0 : 1_000_000 // 1 TRX
          } catch {
            // Ignore activation check errors
            return 0
          }
        })()

        // The router sponsors only ~1% of energy (origin_energy_usage); the user pays the rest, so
        // a realistic estimate is required to avoid OUT_OF_ENERGY reverts and misleading fees.
        // Simulate the real swap when we have an address; otherwise use the conservative fallback.
        const energyUsed = await (async () => {
          // TRC20 sells cost far more energy than native sells (the extra transferFrom token pull)
          const fallbackEnergy = isSellingNativeTrx
            ? SUNIO_FALLBACK_SWAP_ENERGY_NATIVE
            : SUNIO_FALLBACK_SWAP_ENERGY_TRC20
          if (!receiveAddress) return fallbackEnergy
          try {
            const routeParams = buildSwapRouteParameters(
              bestRoute,
              sellAmountIncludingProtocolFeesCryptoBaseUnit,
              '0',
              receiveAddress,
              slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
            )

            const callValue = isSellingNativeTrx
              ? Number(sellAmountIncludingProtocolFeesCryptoBaseUnit)
              : 0

            const result = await tronWeb.transactionBuilder.triggerConstantContract(
              SUNIO_SMART_ROUTER_CONTRACT,
              SUNIO_SWAP_EXACT_INPUT_SELECTOR,
              { callValue },
              buildSwapExactInputParameters(routeParams),
              receiveAddress,
            )
            // The simulation reverts before approval for TRC20 sells; keep the fallback then
            return result?.energy_used || fallbackEnergy
          } catch {
            // Keep the conservative fallback
            return fallbackEnergy
          }
        })()

        // 1.2x safety margin for energy price/usage variance between estimate and execution
        const energyFee = Math.ceil(energyUsed * energyPrice * 1.2)
        const bandwidthFee = 1100 * bandwidthPrice

        return bn(energyFee).plus(bandwidthFee).plus(accountActivationFee).toFixed(0)
      } catch (error) {
        // For rates, fall back to '0' on unexpected failure; quotes require an accurate fee
        if (!isQuote) return '0'
        throw error
      }
    })()

    const buyAmountCryptoBaseUnit = BigAmount.fromPrecision({
      value: bestRoute.amountOut,
      precision: buyAsset.precision,
    }).toBaseUnit()

    // Calculate protocol fees only for quotes
    const protocolFeeCryptoBaseUnit = isQuote
      ? bn(bestRoute.fee).times(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
      : '0'

    const buyAmountAfterFeesCryptoBaseUnit = buyAmountCryptoBaseUnit

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const trade = {
      id: crypto.randomUUID(),
      quoteOrRate: input.quoteOrRate,
      rate,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
      receiveAddress,
      affiliateBps,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees:
              protocolFeeCryptoBaseUnit !== '0'
                ? {
                    [sellAsset.assetId]: {
                      amountCryptoBaseUnit: protocolFeeCryptoBaseUnit,
                      requiresBalance: false,
                      asset: sellAsset,
                    },
                  }
                : {},
          },
          rate,
          source: SwapperName.Sunio,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: SUNIO_SMART_ROUTER_CONTRACT,
          estimatedExecutionTimeMs: undefined,
          ...(isQuote && {
            sunioTransactionMetadata: {
              route: bestRoute,
            },
          }),
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
            isEstimate: true,
          }),
        },
      ],
      swapperName: SwapperName.Sunio,
    }

    return Ok(trade as typeof input.quoteOrRate extends 'quote' ? TradeQuote : TradeRate)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: `[Sun.io] Failed to get trade ${input.quoteOrRate}`,
        code: TradeQuoteError.UnknownError,
        cause: error,
      }),
    )
  }
}
