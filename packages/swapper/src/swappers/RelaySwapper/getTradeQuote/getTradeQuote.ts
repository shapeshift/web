import type { Execute } from '@reservoir0x/relay-sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { isSome } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapErrorRight,
  SwapperConfig,
  SwapperDeps,
  TradeQuoteStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getRelayEvmAssetAddress } from '../utils/getRelayEvmAssetAddress'
import { relayService } from '../utils/relayService'
import type { RelayTradeQuote, RelayTradeRate } from '../utils/types'

type AppFee = {
  recipient: string
  fee: string
}

type Transaction = {
  to: string
  value: string
  data: string
}

export type QuoteParams = {
  user: string
  originChainId: number
  destinationChainId: number
  originCurrency: string
  destinationCurrency: string
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'EXPECTED_OUTPUT'
  recipient?: string
  amount?: string
  txs?: Transaction[]
  referrer?: string
  refundTo?: string
  refundOnOrigin?: boolean
  useReceiver?: boolean
  useExternalLiquidity?: boolean
  usePermit?: boolean
  useDepositAddress?: boolean
  slippageTolerance?: string
  appFees?: AppFee[]
  gasLimitForDepositSpecifiedTxs?: number
  userOperationGasOverhead?: number
  forceSolverExecution?: boolean
}

// @TODO: implement affiliate fees
export const getQuote = async (
  params: QuoteParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<Execute, any>, SwapErrorRight>> => {
  return await relayService.post<Execute>(`${config.VITE_RELAY_API_URL}quote`, params)
}

export async function getTrade({
  input,
  deps,
  relayChainMap,
}: {
  input: GetEvmTradeQuoteInput | GetEvmTradeRateInput
  deps: SwapperDeps
  relayChainMap: Record<ChainId, number>
}): Promise<Result<RelayTradeQuote[] | RelayTradeRate[], SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Relay)

  const sellRelayChainId = relayChainMap[sellAsset.chainId]
  const buyRelayChainId = relayChainMap[buyAsset.chainId]

  if (sellRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }
  if (buyRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const maybeQuote = await getQuote(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayEvmAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayEvmAssetAddress(buyAsset),
      tradeType: 'EXACT_INPUT',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      recipient: receiveAddress,
      user: sendAddress ?? '0x0000000000000000000000000000000000000000',
    },
    deps.config,
  )

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const quote = maybeQuote.unwrap()

  const swapSteps = quote.data.steps.filter(step => step.id !== 'approve')
  const approvalStep = quote.data.steps.find(step => step.id === 'approve')

  // @TODO: send mixpanel event to track multi steps swaps
  if (swapSteps.length > 2) {
    return Err(
      makeSwapErrorRight({
        message: `Relay quote with ${swapSteps.length} swap steps not supported (maximum 2)`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const steps = swapSteps.map(
    (quoteStep): TradeQuoteStep => ({
      allowanceContract: approvalStep?.items?.[0]?.data?.to ?? quoteStep.items?.[0]?.data?.to,
      rate: quote.data.details?.rate ?? '0',
      buyAmountBeforeFeesCryptoBaseUnit: quote.data.details?.currencyOut?.amount ?? '0',
      buyAmountAfterFeesCryptoBaseUnit: quote.data.details?.currencyOut?.minimumAmount ?? '0',
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      accountNumber: 0,
      feeData: {
        networkFeeCryptoBaseUnit: (
          BigInt(approvalStep?.items?.[0]?.data?.gas ?? '0') *
            BigInt(approvalStep?.items?.[0]?.data?.maxFeePerGas ?? '0') +
          BigInt(quoteStep.items?.[0]?.data?.gas ?? '0') *
            BigInt(quoteStep.items?.[0]?.data?.maxFeePerGas ?? '0')
        ).toString(),
        protocolFees: {
          [sellAsset.assetId]: {
            amountCryptoBaseUnit: quote.data.fees?.relayerService?.amount ?? '0',
            asset: sellAsset,
            requiresBalance: true,
          },
        },
      },
      // @TODO: Verify that it contains amm name like jupiter or remove me
      source: `Relay • ${quote.data.details?.operation ?? 'Unknown'}`,
      estimatedExecutionTimeMs: (quote.data.details?.timeEstimate ?? 0) * 1000,
    }),
  )

  console.log({ quote })

  const tradeQuote: RelayTradeQuote = {
    id: quote.data.steps[0].requestId ?? '',
    steps: steps as [TradeQuoteStep] | [TradeQuoteStep, TradeQuoteStep],
    receiveAddress: receiveAddress ?? '',
    rate: quote.data.details?.rate ?? '0',
    quoteOrRate: 'quote' as const,
    swapperName: SwapperName.Relay,
    affiliateBps,
    potentialAffiliateBps,
    selectedRelayRoute: quote.data,
    slippageTolerancePercentageDecimal,
  }

  return Ok([tradeQuote])
}

export const getTradeQuote = async (
  input: GetEvmTradeQuoteInputBase,
  deps: SwapperDeps,
  relayChainMap: Record<ChainId, number>,
): Promise<Result<RelayTradeQuote[], SwapErrorRight>> => {
  const quotesResult = await getTrade({ input, deps, relayChainMap })

  return quotesResult.map(quotes =>
    quotes
      .map(quote => {
        if (!quote.receiveAddress) return undefined

        return {
          ...quote,
          quoteOrRate: 'quote' as const,
          receiveAddress: quote.receiveAddress,
          steps: quote.steps.map(step => step) as
            | [TradeQuoteStep]
            | [TradeQuoteStep, TradeQuoteStep],
        }
      })
      .filter(isSome),
  )
}
