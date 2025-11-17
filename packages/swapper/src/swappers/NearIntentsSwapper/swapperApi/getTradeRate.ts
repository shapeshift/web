import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, bnOrZero, contractAddressOrUndefined, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address, Hex } from 'viem'

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
import { simulateWithStateOverrides } from '../../../utils/tenderly'
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
      dry: false,
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

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    const depositAddress = quote.depositAddress

    const getFeeData = async (): Promise<string | undefined> => {
      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          try {
            const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
            const data = evm.getErc20Data(depositAddress, sellAmount, contractAddress)

            const simulationResult = await simulateWithStateOverrides(
              {
                chainId: sellAsset.chainId,
                from: (sendAddress || depositAddress) as Address,
                to: (contractAddress ?? depositAddress) as Address,
                data: (data || '0x') as Hex,
                value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
                sellAsset,
              },
              {
                apiKey: deps.config.VITE_TENDERLY_API_KEY,
                accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
                projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
              },
            )

            if (!simulationResult.success) {
              return '0'
            }

            console.log('[Near Intents] Tenderly gasLimit:', simulationResult.gasLimit.toString())

            // Calculate network fee using the simulated gas limit
            const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
            const { average } = await sellAdapter.getGasFeeData()

            const supportsEIP1559 = 'maxFeePerGas' in average

            const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
              ...average,
              supportsEIP1559,
              gasLimit: simulationResult.gasLimit.toString(),
            })

            console.log('[Near Intents] Final network fee:', networkFeeCryptoBaseUnit)

            return networkFeeCryptoBaseUnit
          } catch (error) {
            return '0'
          }
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
          try {
            const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
            const tokenId = isToken(sellAsset.assetId)
              ? fromAssetId(sellAsset.assetId).assetReference
              : undefined

            if (!sendAddress) {
              return '0'
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
          } catch (error) {
            return '0'
          }
        }

        default:
          return undefined
      }
    }

    const networkFeeCryptoBaseUnit = (await getFeeData()) || '0'

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
