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
import { PublicKey } from '@solana/web3.js'
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
import { JUPITER_COMPUTE_UNIT_MARGIN_MULTIPLIER, TOKEN_2022_PROGRAM_ID } from '../utils/constants'
import {
  calculateAccountCreationCosts,
  createSwapInstructions,
  getJupiterPrice,
  isSupportedChainId,
} from '../utils/helpers'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    // affiliateBps: _affiliateBps,
    receiveAddress,
    accountNumber,
    sendAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal: _slippageTolerancePercentageDecimal,
  } = input

  const _affiliateBps = '50'

  const { assetsById } = deps

  const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

  const solAsset = assetsById[solAssetId]

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

  if (!solAsset) {
    return Err(
      makeSwapErrorRight({
        message: `solAsset is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

  const buyAssetAddress =
    buyAsset.assetId === solAssetId
      ? fromAssetId(wrappedSolAssetId).assetReference
      : fromAssetId(buyAsset.assetId).assetReference

  const sellAssetAddress =
    sellAsset.assetId === solAssetId
      ? fromAssetId(wrappedSolAssetId).assetReference
      : fromAssetId(sellAsset.assetId).assetReference

  const sellTokenInfo = await adapter
    .getConnection()
    .getAccountInfo(new PublicKey(sellAssetAddress))
  const buyTokenInfo = await adapter.getConnection().getAccountInfo(new PublicKey(buyAssetAddress))
  const isSellTokenToken2022 = sellTokenInfo?.owner.toString() === TOKEN_2022_PROGRAM_ID.toString()
  const isBuyTokenToken2022 = buyTokenInfo?.owner.toString() === TOKEN_2022_PROGRAM_ID.toString()

  const affiliateBps = isSellTokenToken2022 && isBuyTokenToken2022 ? '0' : _affiliateBps

  const maybePriceResponse = await getJupiterPrice({
    apiUrl: jupiterUrl,
    sourceAssetAddress: sellAssetAddress,
    destinationAssetAddress: buyAssetAddress,
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

  const { instructions, addressLookupTableAddresses } = await createSwapInstructions({
    priceResponse,
    sendAddress,
    receiveAddress,
    affiliateBps,
    buyAsset,
    sellAsset,
    adapter,
    jupiterUrl,
  })

  const getFeeData = async () => {
    const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      value: '0',
      chainSpecific: {
        from: sendAddress,
        addressLookupTableAccounts: addressLookupTableAddresses,
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

  const accountCreationFees = calculateAccountCreationCosts(instructions)

  if (accountCreationFees !== '0') {
    const solProtocolFeeAmount = bnOrZero(protocolFees[solAssetId]?.amountCryptoBaseUnit)

    protocolFees[solAssetId] = {
      requiresBalance: true,
      amountCryptoBaseUnit: bnOrZero(solProtocolFeeAmount).plus(accountCreationFees).toFixed(),
      asset: solAsset,
    }
  }

  const tradeQuote: TradeQuote = {
    id: uuid(),
    quoteOrRate: 'quote',
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
          addressLookupTableAddresses,
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
