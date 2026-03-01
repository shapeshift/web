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
import type { SunioRoute } from '../types'
import {
  DEFAULT_SLIPPAGE_PERCENTAGE,
  SUNIO_SMART_ROUTER_CONTRACT,
  SUNIO_TRON_NATIVE_ADDRESS,
} from './constants'
import { convertAddressesToEvmFormat } from './convertAddressesToEvmFormat'
import { fetchSunioQuote } from './fetchFromSunio'
import { isSupportedChainId } from './helpers/helpers'
import { sunioServiceFactory } from './sunioService'

const ENERGY_PRICE = 100
const USER_ENERGY_SHARE = 0.6
const BASE_ENERGY_PER_HOP = 65_000
const TOKEN_ENERGY_SHARE = 0.5
const ENERGY_FACTOR_CACHE_TTL_MS = 6 * 60 * 60 * 1000

const energyFactorCache = new Map<string, { value: number; expiry: number }>()

const simulateSwapEnergy = async (
  route: SunioRoute,
  sellAmountCryptoBaseUnit: string,
  senderAddress: string,
  isSellingNativeTrx: boolean,
  rpcUrl: string,
): Promise<number | undefined> => {
  try {
    const tronWeb = new TronWeb({ fullHost: rpcUrl })

    const path = route.tokens
    const poolVersion = route.poolVersions
    const versionLen = Array(poolVersion.length).fill(2)
    const fees = route.poolFees.map(fee => Number(fee))

    const swapData = {
      amountIn: sellAmountCryptoBaseUnit,
      amountOutMin: '0',
      recipient: senderAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    }

    const parameters = [
      { type: 'address[]', value: path },
      { type: 'string[]', value: poolVersion },
      { type: 'uint256[]', value: versionLen },
      { type: 'uint24[]', value: fees },
      {
        type: 'tuple(uint256,uint256,address,uint256)',
        value: convertAddressesToEvmFormat([
          swapData.amountIn,
          swapData.amountOutMin,
          swapData.recipient,
          swapData.deadline,
        ]),
      },
    ]

    const functionSelector =
      'swapExactInput(address[],string[],uint256[],uint24[],(uint256,uint256,address,uint256))'

    const result = await tronWeb.transactionBuilder.triggerConstantContract(
      SUNIO_SMART_ROUTER_CONTRACT,
      functionSelector,
      { callValue: isSellingNativeTrx ? Number(sellAmountCryptoBaseUnit) : 0 },
      parameters,
      senderAddress,
    )

    if (!result?.energy_used) return undefined

    return result.energy_used + (result.energy_penalty ?? 0)
  } catch {
    return undefined
  }
}

const getTokenEnergyFactor = async (
  rawContractAddress: string,
  rpcUrl: string,
): Promise<number> => {
  const contractAddress = rawContractAddress.toLowerCase()
  const now = Date.now()
  const cached = energyFactorCache.get(contractAddress)
  if (cached && now < cached.expiry) return cached.value

  try {
    const response = await fetch(`${rpcUrl}/wallet/getcontractinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: rawContractAddress, visible: true }),
    })
    const data = await response.json()
    const energyFactor: number = data?.contract_state?.energy_factor ?? 0

    energyFactorCache.set(contractAddress, {
      value: energyFactor,
      expiry: now + ENERGY_FACTOR_CACHE_TTL_MS,
    })

    return energyFactor
  } catch {
    return 0
  }
}

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
      sendAddress,
      receiveAddress,
      accountNumber,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    } = input

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

    if (isQuote && !receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] receiveAddress is required for quotes',
          code: TradeQuoteError.InternalError,
        }),
      )
    }

    const buyAmountCryptoBaseUnit = BigAmount.fromPrecision({
      value: bestRoute.amountOut,
      precision: buyAsset.precision,
    }).toBaseUnit()

    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
    const isSellingNativeTrx = !contractAddress
    const hopCount = bestRoute.tokens.length - 1
    const rpcUrl = deps.config.VITE_TRON_NODE_URL

    const simulationPromise = sendAddress
      ? simulateSwapEnergy(
          bestRoute,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sendAddress,
          isSellingNativeTrx,
          rpcUrl,
        )
      : Promise.resolve(undefined)

    const accountActivationPromise = receiveAddress
      ? fetch(`${rpcUrl}/wallet/getaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: receiveAddress, visible: true }),
        })
          .then(res => res.json())
          .then(info => (info && Object.keys(info).length > 1 ? 0 : 1_000_000))
          .catch(() => 0)
      : Promise.resolve(0)

    const [simulatedEnergy, accountActivationFee] = await Promise.all([
      simulationPromise,
      accountActivationPromise,
    ])

    let totalEnergy: number
    if (simulatedEnergy) {
      totalEnergy = simulatedEnergy
    } else {
      const sellTokenAddress = contractAddress ?? SUNIO_TRON_NATIVE_ADDRESS
      const energyFactor = isSellingNativeTrx
        ? 0
        : await getTokenEnergyFactor(sellTokenAddress, rpcUrl)
      const penaltyMultiplier = 1 + (TOKEN_ENERGY_SHARE * energyFactor) / 10000
      totalEnergy = Math.ceil(BASE_ENERGY_PER_HOP * hopCount * penaltyMultiplier)
    }

    const userEnergy = totalEnergy * USER_ENERGY_SHARE
    const energyFee = userEnergy * ENERGY_PRICE
    const bandwidthFee = 1_100_000

    const networkFeeCryptoBaseUnit = bn(energyFee)
      .plus(bandwidthFee)
      .plus(accountActivationFee)
      .toFixed(0)

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
