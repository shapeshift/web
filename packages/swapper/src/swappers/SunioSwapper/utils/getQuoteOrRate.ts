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
import { DEFAULT_SLIPPAGE_PERCENTAGE, SUNIO_SMART_ROUTER_CONTRACT } from './constants'
import { fetchSunioQuote } from './fetchFromSunio'
import { isSupportedChainId } from './helpers/helpers'
import { sunioServiceFactory } from './sunioService'

type ContractParams = {
  consumeUserResourcePercent: number
  originEnergyLimit: number
  energyFactor: number
}

const CONTRACT_PARAMS_CACHE_TTL_MS = 60 * 60 * 1000
let cachedContractParams: { params: ContractParams; fetchedAt: number } | undefined

async function getContractParams(rpcUrl: string): Promise<ContractParams> {
  const now = Date.now()
  if (cachedContractParams && now - cachedContractParams.fetchedAt < CONTRACT_PARAMS_CACHE_TTL_MS) {
    return cachedContractParams.params
  }

  const [contractResponse, contractInfoResponse] = await Promise.all([
    fetch(`${rpcUrl}/wallet/getcontract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: SUNIO_SMART_ROUTER_CONTRACT, visible: true }),
    }),
    fetch(`${rpcUrl}/wallet/getcontractinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: SUNIO_SMART_ROUTER_CONTRACT, visible: true }),
    }),
  ])

  const contractData = await contractResponse.json()
  const contractInfoData = await contractInfoResponse.json()

  const params: ContractParams = {
    consumeUserResourcePercent: contractData.consume_user_resource_percent ?? 60,
    originEnergyLimit: contractData.origin_energy_limit ?? 1_200_000,
    energyFactor: contractInfoData.contract_state?.energy_factor ?? 0,
  }

  cachedContractParams = { params, fetchedAt: now }
  return params
}

function calculateUserEnergy(totalEnergy: number, contractParams: ContractParams): number {
  const userShare = totalEnergy * (contractParams.consumeUserResourcePercent / 100)
  return Math.min(userShare, contractParams.originEnergyLimit)
}

const SAFETY_MARGIN = 1.3
const BASE_ENERGY_TRX_TO_TOKEN = Math.ceil(150_000 * SAFETY_MARGIN)
const BASE_ENERGY_TRC20_TO_TOKEN = Math.ceil(300_000 * SAFETY_MARGIN)

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

    let networkFeeCryptoBaseUnit: string | undefined = undefined

    if (receiveAddress) {
      try {
        const rpcUrl = deps.config.VITE_TRON_NODE_URL
        const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
        const isSellingNativeTrx = !contractAddress

        const tronWeb = new TronWeb({ fullHost: rpcUrl })

        const [chainParams, contractParams] = await Promise.all([
          tronWeb.trx.getChainParameters(),
          getContractParams(rpcUrl),
        ])

        const bandwidthPrice = chainParams.find(p => p.key === 'getTransactionFee')?.value ?? 1000
        const energyPrice = chainParams.find(p => p.key === 'getEnergyFee')?.value ?? 100

        let accountActivationFee = 0
        try {
          const recipientInfoResponse = await fetch(`${rpcUrl}/wallet/getaccount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: receiveAddress, visible: true }),
          })
          const recipientInfo = await recipientInfoResponse.json()
          const recipientExists = recipientInfo && Object.keys(recipientInfo).length > 1
          if (!recipientExists) {
            accountActivationFee = 1_000_000
          }
        } catch {
          // Ignore activation check errors
        }

        const baseEnergy = isSellingNativeTrx
          ? BASE_ENERGY_TRX_TO_TOKEN
          : BASE_ENERGY_TRC20_TO_TOKEN

        const adjustedEnergy =
          contractParams.energyFactor > 0
            ? Math.ceil(baseEnergy * (1 + contractParams.energyFactor))
            : baseEnergy

        const userEnergy = calculateUserEnergy(adjustedEnergy, contractParams)

        const energyFee = userEnergy * energyPrice
        const bandwidthFee = 1100 * bandwidthPrice

        networkFeeCryptoBaseUnit = bn(energyFee)
          .plus(bandwidthFee)
          .plus(accountActivationFee)
          .toFixed(0)
      } catch (error) {
        if (!isQuote) {
          const fallbackEnergy = BASE_ENERGY_TRC20_TO_TOKEN * 0.6
          const fallbackFee = Math.ceil(fallbackEnergy * 100 + 1100 * 1000)
          networkFeeCryptoBaseUnit = String(fallbackFee)
        } else {
          throw error
        }
      }
    }

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
