import { fromAssetId } from '@shapeshiftoss/caip'
import { OrderKind, type OrderQuoteResponse } from '@shapeshiftoss/types/dist/cowSwap'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SwapErrorRight,
  SwapperConfig,
  TradeQuote,
} from '../../../types'
import { SwapperName } from '../../../types'
import { createTradeAmountTooSmallErr } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { CowSwapError } from '../types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  SUPPORTED_CHAIN_IDS,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import {
  assertValidTrade,
  getAffiliateAppDataFragmentByChainId,
  getCowswapNetwork,
  getFullAppData,
  getNowPlusThirtyMinutesTimestamp,
  getValuesFromQuoteResponse,
} from '../utils/helpers/helpers'

async function _getCowSwapTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  config: SwapperConfig,
): Promise<Result<TradeQuote, SwapErrorRight>> {
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

  const maybeNetwork = getCowswapNetwork(chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())

  const network = maybeNetwork.unwrap()

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
      from: receiveAddress ?? zeroAddress,
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
          minAmountCryptoBaseUnit: bn(errData?.data.fee_amount ?? '0x0', 16).toFixed(),
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

  const quote: TradeQuote = {
    id: cowswapQuoteResponse.id?.toString() ?? uuid(),
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    rate,
    slippageTolerancePercentageDecimal,
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
        cowswapQuoteResponse,
      },
    ],
  }

  return Ok(quote)
}

export const getCowSwapTradeQuote = (
  input: GetEvmTradeQuoteInputBase,
  config: SwapperConfig,
): Promise<Result<TradeQuote, SwapErrorRight>> => _getCowSwapTradeQuote(input, config)
