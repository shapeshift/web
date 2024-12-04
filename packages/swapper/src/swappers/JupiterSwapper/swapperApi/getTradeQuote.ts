import type { Instruction } from '@jup-ag/api'
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
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, bnOrZero, convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import type {
  CommonTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { JUPITER_COMPUTE_UNIT_MARGIN_MULTIPLIER } from '../utils/constants'
import { getJupiterPrice, getJupiterSwapInstructions, isSupportedChainId } from '../utils/helpers'

export const getTradeQuote = async (
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
    slippageTolerancePercentageDecimal: _slippageTolerancePercentageDecimal,
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
    slippageBps: _slippageTolerancePercentageDecimal
      ? convertDecimalPercentageToBasisPoints(_slippageTolerancePercentageDecimal).toFixed()
      : undefined,
  })

  if (maybePriceResponse.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const { data: priceResponse } = maybePriceResponse.unwrap()

  const slippageTolerancePercentageDecimal =
    // Divide by 100 to get actual decimal percentage from bps
    // e.g for 0.5% bps, Jupiter represents this as 50. 50/100 = 0.5, then we div by 100 again to honour our decimal format e.g 0.5/100 = 0.005
    bn(priceResponse.slippageBps).div(100).div(100).toString()

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
    rawQuote: priceResponse,
    // Shared account is not supported for simple AMMs
    useSharedAccounts: priceResponse.routePlan.length > 1 && isCrossAccountTrade ? true : false,
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

  const protocolFees: Record<AssetId, ProtocolFee> = priceResponse.routePlan.reduce(
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

  const quotes: TradeQuote[] = []

  const feeData = await getFeeData()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: priceResponse.inAmount,
    buyAmountCryptoBaseUnit: priceResponse.outAmount,
    sellAsset,
    buyAsset,
  })

  const tradeQuote: TradeQuote = {
    id: uuid(),
    rate,
    potentialAffiliateBps: affiliateBps,
    affiliateBps,
    receiveAddress,
    slippageTolerancePercentageDecimal,
    steps: [
      {
        accountNumber,
        buyAmountBeforeFeesCryptoBaseUnit: priceResponse.outAmount,
        buyAmountAfterFeesCryptoBaseUnit: priceResponse.outAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: priceResponse.inAmount,
        jupiterQuoteResponse: priceResponse,
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
        // Swap are so fasts on solana that times are under 100ms displaying 0 or very small amount of time is not user friendly
        estimatedExecutionTimeMs: undefined,
      },
    ],
  }

  quotes.push(tradeQuote)

  return Ok(quotes)
}
