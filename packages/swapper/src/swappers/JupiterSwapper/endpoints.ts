import type { Instruction, QuoteResponse } from '@jup-ag/api'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  fromAssetId,
  solAssetId,
  toAssetId,
  wrappedSolAssetId,
} from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero, convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUnsignedSolanaTransactionArgs,
  ProtocolFee,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../types'
import { isSolanaFeeData, SwapperName, TradeQuoteError } from '../../types'
import {
  checkSolanaSwapStatus,
  getRate,
  isExecutableTradeQuote,
  isExecutableTradeStep,
  makeSwapErrorRight,
} from '../../utils'
import { JUPITER_COMPUTE_UNIT_MARGIN_MULTIPLIER, SOLANA_RANDOM_ADDRESS } from './utils/constants'
import { getJupiterPrice, getJupiterSwapInstructions, isSupportedChainId } from './utils/helpers'

const tradeQuoteMetadata: Map<string, QuoteResponse> = new Map()

export const jupiterApi: SwapperApi = {
  getTradeRate: async (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
      affiliateBps,
      receiveAddress,
      accountNumber,
      slippageTolerancePercentageDecimal,
    } = input

    const { assetsById } = deps

    const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

    if (!isSupportedChainId(sellAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported chainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (!isSupportedChainId(buyAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported chainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (buyAsset.assetId === wrappedSolAssetId || sellAsset.assetId === wrappedSolAssetId) {
      return Err(
        makeSwapErrorRight({
          message: `Unsupported trade pair`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }

    const maybePriceResponse = await getJupiterPrice({
      apiUrl: jupiterUrl,
      sourceAsset: sellAsset.assetId === solAssetId ? wrappedSolAssetId : sellAsset.assetId,
      destinationAsset: buyAsset.assetId === solAssetId ? wrappedSolAssetId : buyAsset.assetId,
      commissionBps: affiliateBps,
      amount: sellAmount,
      slippageBps: convertDecimalPercentageToBasisPoints(
        slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
      ).toFixed(),
    })

    if (maybePriceResponse.isErr()) {
      return Err(
        makeSwapErrorRight({
          message: 'Quote request failed',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const { data: quoteResponse } = maybePriceResponse.unwrap()

    tradeQuoteMetadata.set('rate', quoteResponse)

    const getFeeData = async () => {
      const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
        // used as a placeholder for the sake of loosely estimating fees
        to: SOLANA_RANDOM_ADDRESS,
        value: sellAmount,
        chainSpecific: {
          from: SOLANA_RANDOM_ADDRESS,
          tokenId:
            sellAsset.assetId === solAssetId
              ? undefined
              : fromAssetId(sellAsset.assetId).assetReference,
        },
      }
      const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
      return { networkFeeCryptoBaseUnit: fast.txFee }
    }

    const protocolFees: Record<AssetId, ProtocolFee> = quoteResponse.routePlan.reduce(
      (acc, route) => {
        const feeAssetId = toAssetId({
          assetReference: route.swapInfo.feeMint,
          assetNamespace: ASSET_NAMESPACE.splToken,
          chainNamespace: CHAIN_NAMESPACE.Solana,
          chainReference: CHAIN_REFERENCE.SolanaMainnet,
        })
        const feeAsset = assetsById[feeAssetId]

        // If we can't find the feeAsset, we can't provide a protocol fee to display
        // But these fees exists at protocol level, it's mostly to make TS happy as we should have the market data and assets
        if (!feeAsset) return acc

        acc[feeAssetId] = {
          requiresBalance: false,
          amountCryptoBaseUnit: bnOrZero(route.swapInfo.feeAmount).toFixed(0),
          asset: feeAsset,
        }

        return acc
      },
      {} as Record<AssetId, ProtocolFee>,
    )

    const getQuoteRate = (sellAmountCryptoBaseUnit: string, buyAmountCryptoBaseUnit: string) => {
      return getRate({
        sellAmountCryptoBaseUnit,
        buyAmountCryptoBaseUnit,
        sellAsset,
        buyAsset,
      })
    }

    const rates: TradeRate[] = []

    const feeData = await getFeeData()

    const rate = getQuoteRate(quoteResponse.inAmount, quoteResponse.outAmount)

    const tradeRate: TradeRate = {
      id: uuid(),
      rate,
      receiveAddress,
      potentialAffiliateBps: affiliateBps,
      affiliateBps,
      accountNumber,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: quoteResponse.outAmount,
          buyAmountAfterFeesCryptoBaseUnit: quoteResponse.outAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quoteResponse.inAmount,
          jupiterQuoteResponse: quoteResponse,
          feeData: {
            protocolFees,
            ...feeData,
          },
          rate,
          source: SwapperName.Jupiter,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: quoteResponse.timeTaken! * 1000,
        },
      ],
    }

    rates.push(tradeRate)

    return Ok(rates)
  },
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const {
      sellAsset,
      buyAsset,
      affiliateBps,
      receiveAddress,
      accountNumber,
      sendAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
      slippageTolerancePercentageDecimal,
    } = input

    const { assetsById } = deps

    const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

    if (accountNumber === undefined) {
      return Err(
        makeSwapErrorRight({
          message: `accountNumber is required`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    if (!isSupportedChainId(sellAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported chainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (!isSupportedChainId(buyAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported chainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (!sendAddress) {
      return Err(
        makeSwapErrorRight({
          message: `sendAddress is required`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const maybePriceResponse = await getJupiterPrice({
      apiUrl: jupiterUrl,
      sourceAsset: sellAsset.assetId === solAssetId ? wrappedSolAssetId : sellAsset.assetId,
      destinationAsset: buyAsset.assetId === solAssetId ? wrappedSolAssetId : buyAsset.assetId,
      commissionBps: affiliateBps,
      amount: sellAmount,
      slippageBps: convertDecimalPercentageToBasisPoints(
        slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
      ).toFixed(),
    })

    if (maybePriceResponse.isErr()) {
      return Err(
        makeSwapErrorRight({
          message: 'Quote request failed',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const { data: quoteResponse } = maybePriceResponse.unwrap()

    const contractAddress =
      buyAsset.assetId === solAssetId ? undefined : fromAssetId(buyAsset.assetId).assetReference

    const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

    const isCrossAccountTrade = receiveAddress ? receiveAddress !== sendAddress : false

    const { instruction: createTokenAccountInstruction, destinationTokenAccount } =
      contractAddress && isCrossAccountTrade
        ? await adapter.createAssociatedTokenAccountInstruction({
            from: sendAddress,
            to: receiveAddress!,
            tokenId: contractAddress,
          })
        : { instruction: undefined, destinationTokenAccount: undefined }

    const maybeSwapResponse = await getJupiterSwapInstructions({
      apiUrl: jupiterUrl,
      fromAddress: sendAddress,
      toAddress: isCrossAccountTrade ? destinationTokenAccount?.toString() : undefined,
      rawQuote: quoteResponse,
      wrapAndUnwrapSol: buyAsset.assetId === wrappedSolAssetId ? false : true,
      // Shared account is not supported for simple AMMs
      useSharedAccounts: quoteResponse.routePlan.length > 1 && isCrossAccountTrade ? true : false,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    const convertJupiterInstruction = (instruction: Instruction): TransactionInstruction => ({
      ...instruction,
      keys: instruction.accounts.map(account => ({
        ...account,
        pubkey: new PublicKey(account.pubkey),
      })),
      data: Buffer.from(instruction.data, 'base64'),
      programId: new PublicKey(instruction.programId),
    })

    const instructions: TransactionInstruction[] = [
      ...swapResponse.setupInstructions.map(convertJupiterInstruction),
      convertJupiterInstruction(swapResponse.swapInstruction),
    ]

    if (createTokenAccountInstruction) {
      instructions.unshift(createTokenAccountInstruction)
    }

    if (swapResponse.cleanupInstruction) {
      instructions.push(convertJupiterInstruction(swapResponse.cleanupInstruction))
    }

    const getFeeData = async () => {
      const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
      const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
        to: '',
        value: '0',
        chainSpecific: {
          from: sendAddress,
          addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
          instructions,
        },
      }
      const feeData = await sellAdapter.getFeeData(getFeeDataInput)
      return {
        txFee: feeData.fast.txFee,
        chainSpecific: {
          computeUnits: bnOrZero(feeData.fast.chainSpecific.computeUnits)
            .times(JUPITER_COMPUTE_UNIT_MARGIN_MULTIPLIER)
            .toFixed(0),
          priorityFee: feeData.fast.chainSpecific.priorityFee,
        },
      }
    }

    const protocolFees: Record<AssetId, ProtocolFee> = quoteResponse.routePlan.reduce(
      (acc, route) => {
        const feeAssetId = toAssetId({
          assetReference: route.swapInfo.feeMint,
          assetNamespace: ASSET_NAMESPACE.splToken,
          chainNamespace: CHAIN_NAMESPACE.Solana,
          chainReference: CHAIN_REFERENCE.SolanaMainnet,
        })
        const feeAsset = assetsById[feeAssetId]

        // If we can't find the feeAsset, we can't provide a protocol fee to display
        // But these fees exists at protocol level, it's mostly to make TS happy as we should have the market data and assets
        if (!feeAsset) return acc

        acc[feeAssetId] = {
          requiresBalance: false,
          amountCryptoBaseUnit: bnOrZero(route.swapInfo.feeAmount).toFixed(0),
          asset: feeAsset,
        }

        return acc
      },
      {} as Record<AssetId, ProtocolFee>,
    )

    const getQuoteRate = (sellAmountCryptoBaseUnit: string, buyAmountCryptoBaseUnit: string) => {
      return getRate({
        sellAmountCryptoBaseUnit,
        buyAmountCryptoBaseUnit,
        sellAsset,
        buyAsset,
      })
    }

    const quotes: TradeQuote[] = []

    const feeData = await getFeeData()

    const rate = getQuoteRate(quoteResponse.inAmount, quoteResponse.outAmount)

    const tradeQuote: TradeQuote = {
      id: uuid(),
      rate,
      potentialAffiliateBps: affiliateBps,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
      steps: [
        {
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: quoteResponse.outAmount,
          buyAmountAfterFeesCryptoBaseUnit: quoteResponse.outAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quoteResponse.inAmount,
          jupiterQuoteResponse: quoteResponse,
          jupiterTransactionMetadata: {
            addressLookupTableAddresses: swapResponse.addressLookupTableAddresses,
            instructions,
          },
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: feeData.txFee,
            chainSpecific: feeData.chainSpecific,
          },
          rate,
          source: SwapperName.Jupiter,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: quoteResponse.timeTaken! * 1000,
        },
      ],
    }

    quotes.push(tradeQuote)

    return Ok(quotes)
  },
  getUnsignedSolanaTransaction: async ({
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    const solanaInstructions = step.jupiterTransactionMetadata?.instructions?.map(instruction =>
      adapter.convertInstruction(instruction),
    )

    if (!isSolanaFeeData(step.feeData.chainSpecific)) throw Error('Unable to execute step')

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      from,
      value: '0',
      accountNumber: step.accountNumber,
      chainSpecific: {
        addressLookupTableAccounts: step.jupiterTransactionMetadata?.addressLookupTableAddresses,
        instructions: solanaInstructions,
        computeUnitLimit: step.feeData.chainSpecific?.computeUnits,
        computeUnitPrice: step.feeData.chainSpecific?.priorityFee,
      },
    }

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },

  checkTradeStatus: checkSolanaSwapStatus,
}
