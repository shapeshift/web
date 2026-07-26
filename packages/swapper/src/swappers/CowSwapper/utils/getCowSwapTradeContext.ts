import { fromAssetId } from '@shapeshiftoss/caip'
import type { CowSwapError, OrderQuoteResponse } from '@shapeshiftoss/types'
import { OrderKind } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import {
  getAffiliateAppDataFragmentByChainId,
  getCowNetwork,
  getFullAppData,
} from '../../../cowswap-utils'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  SUPPORTED_CHAIN_IDS,
} from '../../../cowswap-utils/constants'
import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { CowSwapTradeQuoteInput, CowSwapTradeRateInput } from '../types'
import { cowService } from '../utils/cowService'
import {
  assertValidTrade,
  getNowPlusThirtyMinutesTimestamp,
  getValuesFromQuoteResponse,
} from '../utils/helpers'
import type { GetCowSwapStepDataArgs } from './getCowSwapStepData'

type CowSwapTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetCowSwapStepDataArgs, 'type' | 'input' | 'from'>
}

export const getCowSwapTradeContext = async ({
  input,
  deps,
  senderAddress,
  receiveAddress,
}: {
  input: CowSwapTradeQuoteInput | CowSwapTradeRateInput
  deps: SwapperDeps
  senderAddress: string
  receiveAddress: string | undefined
}): Promise<Result<CowSwapTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    chainId,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.CowSwap)

  const assertion = assertValidTrade({
    buyAsset,
    sellAsset,
    supportedChainIds: SUPPORTED_CHAIN_IDS,
  })

  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? fromAssetId(buyAsset.assetId).assetReference
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

  const network = getCowNetwork(chainId)
  if (!network)
    return Err(
      makeSwapErrorRight({
        message: `[getCowSwapTradeContext] - Unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId },
      }),
    )

  const affiliateAppDataFragment = getAffiliateAppDataFragmentByChainId({
    affiliateBps,
    chainId: sellAsset.chainId,
  })

  const { appData, appDataHash } = await getFullAppData(
    slippageTolerancePercentageDecimal,
    affiliateAppDataFragment,
    'market',
  )

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<OrderQuoteResponse>(
    `${deps.config.VITE_COWSWAP_BASE_URL}/${network}/api/v1/quote`,
    {
      sellToken: fromAssetId(sellAsset.assetId).assetReference,
      buyToken,
      receiver: receiveAddress,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData,
      appDataHash,
      partiallyFillable: false,
      from: senderAddress,
      kind: OrderKind.SELL,
      sellAmountBeforeFee: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    },
  )

  if (maybeQuoteResponse.isErr()) {
    const err = maybeQuoteResponse.unwrapErr()
    const errData = (err.cause as AxiosError<CowSwapError>)?.response?.data
    if (
      (err.cause as AxiosError)?.isAxiosError &&
      errData?.errorType === 'SellAmountDoesNotCoverFee'
    ) {
      return Err(
        createTradeAmountTooSmallErr({
          assetId: sellAsset.assetId,
          minAmountCryptoBaseUnit: bn(
            (errData?.data as { fee_amount?: string }).fee_amount ?? '0x0',
            16,
          ).toFixed(),
        }),
      )
    }
    return Err(err)
  }

  const { data: cowswapQuoteResponse } = maybeQuoteResponse.unwrap()
  const { feeAmount: feeAmountInSellTokenCryptoBaseUnit } = cowswapQuoteResponse.quote

  const { buyAmountAfterFeesCryptoBaseUnit, buyAmountBeforeFeesCryptoBaseUnit } =
    getValuesFromQuoteResponse({
      buyAsset,
      sellAsset,
      response: cowswapQuoteResponse,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    })

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const id = cowswapQuoteResponse.id?.toString()
  if (!id) {
    return Err(
      makeSwapErrorRight({
        message: `[getCowSwapTradeContext] - missing quote ID`,
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  return Ok({
    tradeCommon: {
      id,
      rate,
      swapperName: SwapperName.CowSwap,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: undefined,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      rate,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source: SwapperName.CowSwap,
      buyAsset,
      sellAsset,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        isEstimate: true,
      }),
    },
    protocolFees: {
      [sellAsset.assetId]: {
        amountCryptoBaseUnit: feeAmountInSellTokenCryptoBaseUnit,
        // Technically requires balance, but we deduct it off the sell amount
        requiresBalance: false,
        asset: sellAsset,
      },
    },
    stepDataArgs: {
      deps,
      sellAsset,
      cowswapQuoteResponse,
      appDataHash,
      buyAmountAfterFeesCryptoBaseUnit,
    },
  })
}
