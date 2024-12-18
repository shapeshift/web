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
  GetTradeRateInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { SOLANA_RANDOM_ADDRESS, TOKEN_2022_PROGRAM_ID } from '../utils/constants'
import {
  calculateAccountCreationCosts,
  createSwapInstructions,
  getJupiterPrice,
  isSupportedChainId,
} from '../utils/helpers'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps: _affiliateBps,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal: _slippageTolerancePercentageDecimal,
  } = input

  const { assetsById } = deps

  const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

  const solAsset = assetsById[solAssetId]

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

  if (!solAsset) {
    return Err(
      makeSwapErrorRight({
        message: `solAsset should be defined`,
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

  const rates: TradeRate[] = []

  const feeData = await getFeeData()

  const inputOutputRate = getInputOutputRate({
    sellAmountCryptoBaseUnit: priceResponse.inAmount,
    buyAmountCryptoBaseUnit: priceResponse.outAmount,
    sellAsset,
    buyAsset,
  })

  const slippageTolerancePercentageDecimal =
    // Divide by 100 to get actual decimal percentage from bps
    // e.g for 0.5% bps, Jupiter represents this as 50. 50/100 = 0.5, then we div by 100 again to honour our decimal format e.g 0.5/100 = 0.005
    bn(priceResponse.slippageBps).div(100).div(100).toString()

  const { instructions } = await createSwapInstructions({
    priceResponse,
    sendAddress: input.sendAddress ?? SOLANA_RANDOM_ADDRESS,
    receiveAddress,
    affiliateBps,
    buyAsset,
    sellAsset,
    adapter,
    jupiterUrl,
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

  const tradeRate: TradeRate = {
    id: uuid(),
    quoteOrRate: 'rate',
    rate: inputOutputRate,
    receiveAddress,
    potentialAffiliateBps: affiliateBps,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: priceResponse.outAmount,
        buyAmountAfterFeesCryptoBaseUnit: priceResponse.outAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: priceResponse.inAmount,
        jupiterQuoteResponse: priceResponse,
        feeData: {
          protocolFees,
          ...feeData,
        },
        rate: inputOutputRate,
        source: SwapperName.Jupiter,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract: '0x0',
        // Swap are so fasts on solana that times are under 100ms displaying 0 or very small amount of time is not user friendly
        estimatedExecutionTimeMs: undefined,
      },
    ],
  }

  rates.push(tradeRate)

  return Ok(rates)
}
