import type { AssetId } from '@shapeshiftoss/caip'
import { bchAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import BigNumber from 'bignumber.js'
import { getConfig } from 'config'
import qs from 'qs'
import type { Asset } from 'lib/asset-service'
import { baseUnitToPrecision, bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type {
  ThornodeQuoteResponse,
  ThornodeQuoteResponseSuccess,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import {
  THORCHAIN_AFFILIATE_NAME,
  THORCHAIN_FIXED_PRECISION,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { assertIsValidMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/assertIsValidMemo'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { createTradeAmountTooSmallErr } from 'lib/swapper/utils'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { thorService } from '../thorService'

export const getQuote = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  affiliateBps = '0',
  slippageBps,
}: {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  // Receive address is optional for THOR quotes, and will be in case we are getting a quote with a missing manual receive address
  receiveAddress: string | undefined
  affiliateBps: string
  slippageBps: string
}): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  const sellAmountCryptoPrecision = baseUnitToPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
  })
  // All THORChain pool amounts are base 8 regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    toBaseUnit(sellAmountCryptoPrecision, THORCHAIN_FIXED_PRECISION),
  )

  // The THORChain swap endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedReceiveAddress =
    receiveAddress && buyAssetId === bchAssetId
      ? receiveAddress.replace('bitcoincash:', '')
      : receiveAddress

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: parsedReceiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: THORCHAIN_AFFILIATE_NAME,
  })
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybeData = (
    await thorService.get<ThornodeQuoteResponse>(
      `${daemonUrl}/lcd/thorchain/quote/swap?${queryString}`,
    )
  ).andThen(({ data }) => Ok(data))

  if (maybeData.isErr()) return Err(maybeData.unwrapErr())
  const data = maybeData.unwrap()
  const isError = 'error' in data

  if (
    isError &&
    (/not enough fee/.test(data.error) || /not enough to pay transaction fee/.test(data.error))
  ) {
    return Err(createTradeAmountTooSmallErr())
  } else if (isError && /trading is halted/.test(data.error)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: Trading is halted, cannot process swap`,
        code: SwapErrorType.TRADING_HALTED,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  } else if (isError) {
    return Err(
      makeSwapErrorRight({
        message: data.error,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  } else {
    const memoWithManualSlippage = (() => {
      const MEMO_PART_DELIMITER = ':'
      // TODO: Woody you'll need to use expected_amount_out_streaming for streaming swaps
      const { memo: quotedMemo, expected_amount_out: expectedAmountOut } = data
      const memoParts = quotedMemo.split(MEMO_PART_DELIMITER)

      const pool = memoParts[1]
      const address = memoParts[2]
      const affiliate = memoParts[4]
      const affiliateBps = memoParts[5]

      const limitWithManualSlippage = subtractBasisPointAmount(
        expectedAmountOut,
        slippageBps,
        BigNumber.ROUND_DOWN,
      )

      const memo = `s${MEMO_PART_DELIMITER}${pool}${MEMO_PART_DELIMITER}${address}${MEMO_PART_DELIMITER}${limitWithManualSlippage}${MEMO_PART_DELIMITER}${affiliate}${MEMO_PART_DELIMITER}${affiliateBps}`
      assertIsValidMemo(memo)
      return memo
    })()
    return Ok({ ...data, memo: memoWithManualSlippage })
  }
}
