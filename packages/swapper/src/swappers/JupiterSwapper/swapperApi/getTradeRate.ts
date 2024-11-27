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
import { bnOrZero, convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../..'
import type {
  GetTradeRateInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import { SOLANA_RANDOM_ADDRESS } from '../utils/constants'
import { getJupiterPrice, isSupportedChainId } from '../utils/helpers'

export const getTradeRate = async (
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
}
