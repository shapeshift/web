import { fromAssetId } from '@shapeshiftoss/caip'
import type { CowSwapError, OrderQuoteResponse } from '@shapeshiftoss/types'
import { OrderKind } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { zeroAddress } from 'viem'

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
import type { GetEvmTradeRateInput, SwapErrorRight, SwapperConfig, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { cowService } from '../utils/cowService'
import {
  assertValidTrade,
  getNowPlusThirtyMinutesTimestamp,
  getValuesFromQuoteResponse,
} from '../utils/helpers/helpers'

async function _getCowSwapTradeRate(
  input: GetEvmTradeRateInput,
  config: SwapperConfig,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    chainId,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    potentialAffiliateBps,
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

  const maybeNetwork = getCowNetwork(chainId)
  if (!maybeNetwork)
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: _getCowSwapTradeRate] - Unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId },
      }),
    )

  const network = maybeNetwork

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
    `${config.REACT_APP_COWSWAP_BASE_URL}/${network}/api/v1/quote/`,
    {
      sellToken: fromAssetId(sellAsset.assetId).assetReference,
      buyToken,
      receiver: receiveAddress,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData,
      appDataHash,
      partiallyFillable: false,
      from: zeroAddress,
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
    return Err(maybeQuoteResponse.unwrapErr())
  }

  const { data: cowswapQuoteResponse } = maybeQuoteResponse.unwrap()

  const { feeAmount: feeAmountInSellTokenCryptoBaseUnit } = cowswapQuoteResponse.quote

  const { rate, buyAmountAfterFeesCryptoBaseUnit, buyAmountBeforeFeesCryptoBaseUnit } =
    getValuesFromQuoteResponse({
      buyAsset,
      sellAsset,
      response: cowswapQuoteResponse,
      affiliateBps,
    })

  const id = cowswapQuoteResponse.id?.toString()

  if (!id) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: _getCowSwapTradeRate] - missing quote ID`,
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const quote: TradeRate = {
    id,
    quoteOrRate: 'rate',
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    rate,
    slippageTolerancePercentageDecimal,
    swapperName: SwapperName.CowSwap,
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
        rate,
        feeData: {
          networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
          protocolFees: {
            [sellAsset.assetId]: {
              amountCryptoBaseUnit: feeAmountInSellTokenCryptoBaseUnit,
              // Technically does, but we deduct it off the sell amount
              requiresBalance: false,
              asset: sellAsset,
            },
          },
        },
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        source: SwapperName.CowSwap,
        buyAsset,
        sellAsset,
        accountNumber,
      },
    ],
  }

  return Ok(quote)
}

export const getCowSwapTradeRate = (
  input: GetEvmTradeRateInput,
  config: SwapperConfig,
): Promise<Result<TradeRate, SwapErrorRight>> => _getCowSwapTradeRate(input, config)
