import { fromAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperConfig,
  TradeQuoteOrRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { CoWSwapOrderKind, type CowSwapQuoteError, type CowSwapQuoteResponse } from '../types'
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

export async function getCowSwapTradeQuote(
  input: GetTradeQuoteInput,
  config: SwapperConfig,
): Promise<Result<TradeQuoteOrRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    chainId,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    potentialAffiliateBps,
    affiliateBps,
    isConnected,
  } = input

  // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
  // this won't be an issue anymore
  if (isConnected && !(receiveAddress && accountNumber !== undefined))
    return Err(
      makeSwapErrorRight({
        message: 'missing address',
        code: TradeQuoteError.InternalError,
      }),
    )

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
  )

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
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
      kind: CoWSwapOrderKind.Sell,
      sellAmountBeforeFee: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    },
  )

  if (maybeQuoteResponse.isErr()) {
    const err = maybeQuoteResponse.unwrapErr()
    const errData = (err.cause as AxiosError<CowSwapQuoteError>)?.response?.data
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

  const { data } = maybeQuoteResponse.unwrap()

  const { feeAmount: feeAmountInSellTokenCryptoBaseUnit } = data.quote

  const { rate, buyAmountAfterFeesCryptoBaseUnit, buyAmountBeforeFeesCryptoBaseUnit } =
    getValuesFromQuoteResponse({
      buyAsset,
      sellAsset,
      response: data,
      affiliateBps,
    })

  const quote: TradeQuoteOrRate = {
    id: data.id.toString(),
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
        // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
        // this won't be an issue anymore - for now this is tackled at runtime with the isConnected check above
        accountNumber: accountNumber!,
      },
    ],
  }

  return Ok(quote)
}
