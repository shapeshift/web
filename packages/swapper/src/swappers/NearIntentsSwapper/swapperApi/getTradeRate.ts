import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, bnOrZero, contractAddressOrUndefined, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { DEFAULT_QUOTE_DEADLINE_MS, DEFAULT_SLIPPAGE_BPS } from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { assetToNearIntentsAsset, calculateAccountCreationCosts } from '../utils/helpers/helpers'
import { initializeOneClickService, OneClickService } from '../utils/oneClickService'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    sendAddress,
    receiveAddress,
  } = input

  try {
    initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

    // Wallet connected: use actual addresses
    // No wallet: use "check-price" sentinel with INTENTS types
    const hasWallet = sendAddress !== undefined

    const quoteRequest: QuoteRequest = {
      dry: true,
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: slippageTolerancePercentageDecimal
        ? bnOrZero(slippageTolerancePercentageDecimal).times(10000).toNumber()
        : DEFAULT_SLIPPAGE_BPS,
      originAsset,
      destinationAsset,
      amount: sellAmount,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: sendAddress ?? 'check-price',
      refundType: hasWallet
        ? QuoteRequest.refundType.ORIGIN_CHAIN
        : QuoteRequest.refundType.INTENTS,
      recipient: receiveAddress ?? 'check-price',
      recipientType: hasWallet
        ? QuoteRequest.recipientType.DESTINATION_CHAIN
        : QuoteRequest.recipientType.INTENTS,
      deadline: new Date(Date.now() + DEFAULT_QUOTE_DEADLINE_MS).toISOString(),
      // TODO(gomes): appFees disabled - https://github.com/shapeshift/web/issues/11022
    }

    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    // Calculate fees for rate (same logic as getTradeQuote)
    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    const depositAddress = quote.depositAddress

    console.log('[NEAR Intents Rate] Calculating fees:', {
      chainNamespace,
      hasSendAddress: !!sendAddress,
      depositAddress,
      sellAssetId: sellAsset.assetId,
    })

    const getFeeData = async (): Promise<string | undefined> => {
      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
          const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
          const data = evm.getErc20Data(depositAddress, sellAmount, contractAddress)

          console.log('[NEAR Intents Rate] EVM fee params:', {
            to: contractAddress ?? depositAddress,
            value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
            from: sendAddress || depositAddress,
            contractAddress,
            hasData: !!data,
          })

          // For rates without wallet, sendAddress might be undefined
          const feeData = await sellAdapter.getFeeData({
            to: contractAddress ?? depositAddress,
            value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
            chainSpecific: {
              from: sendAddress || depositAddress,
              contractAddress,
              data: data || '0x',
            },
            sendMax: false,
          })
          console.log('[NEAR Intents Rate] EVM fee calculated:', feeData.fast.txFee)
          return feeData.fast.txFee
        }

        case CHAIN_NAMESPACE.Utxo: {
          const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
          const pubkey = (input as GetUtxoTradeRateInput).xpub

          if (!pubkey) {
            return undefined
          }

          const feeData = await sellAdapter.getFeeData({
            to: depositAddress,
            value: sellAmount,
            chainSpecific: { pubkey },
            sendMax: false,
          })
          return feeData.fast.txFee
        }

        case CHAIN_NAMESPACE.Solana: {
          const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
          const tokenId = isToken(sellAsset.assetId)
            ? fromAssetId(sellAsset.assetId).assetReference
            : undefined

          // For rates without wallet, sendAddress might be undefined
          if (!sendAddress) {
            return undefined
          }

          const instructions = await sellAdapter.buildEstimationInstructions({
            from: sendAddress,
            to: depositAddress,
            tokenId,
            value: sellAmount,
          })

          const feeData = await sellAdapter.getFeeData({
            to: depositAddress,
            value: sellAmount,
            chainSpecific: {
              from: sendAddress,
              tokenId,
              instructions,
            },
            sendMax: false,
          })

          const txFee = feeData.fast.txFee
          const ataCreationCost = calculateAccountCreationCosts(instructions)
          return bn(txFee).plus(ataCreationCost).toString()
        }

        default:
          return undefined
      }
    }

    let networkFeeCryptoBaseUnit: string
    try {
      networkFeeCryptoBaseUnit = (await getFeeData()) || '0'
      console.log('[NEAR Intents Rate] Final fee:', networkFeeCryptoBaseUnit)
    } catch (error) {
      console.error('[NEAR Intents Rate] Fee estimation failed:', error)
      throw error
    }

    const tradeRate: TradeRate = {
      id: uuid(),
      receiveAddress: receiveAddress ?? undefined,
      affiliateBps,
      rate: bn(quote.amountOut).div(quote.amountIn).toString(),
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
      quoteOrRate: 'rate' as const,
      swapperName: SwapperName.NearIntents,
      steps: [
        {
          accountNumber: undefined,
          allowanceContract: '',
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          rate: bn(quote.amountOut).div(quote.amountIn).toString(),
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
        },
      ],
    }

    return Ok([tradeRate])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting NEAR Intents rate',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
