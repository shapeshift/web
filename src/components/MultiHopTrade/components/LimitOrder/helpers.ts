import type { SerializedError } from '@reduxjs/toolkit'
import type { CowSwapError } from '@shapeshiftoss/swapper'
import { OrderError } from '@shapeshiftoss/types/dist/cowSwap'
import type { InterpolationOptions } from 'node-polyglot'
import { assertUnreachable } from 'lib/utils'

export const isCowSwapError = (
  maybeCowSwapError: CowSwapError | SerializedError | undefined,
): maybeCowSwapError is CowSwapError => {
  return (
    typeof maybeCowSwapError === 'object' &&
    Object.values(OrderError).includes((maybeCowSwapError as CowSwapError).errorType)
  )
}

export const getCowSwapErrorTranslation = (
  limitOrderQuoteError: SerializedError | CowSwapError,
): string | [string, InterpolationOptions] => {
  if (!isCowSwapError(limitOrderQuoteError)) {
    return 'trade.errors.quoteError'
  }

  const { errorType } = limitOrderQuoteError

  switch (errorType) {
    case OrderError.INSUFFICIENT_BALANCE:
      return 'common.insufficientFunds'
    case OrderError.INSUFFICIENT_ALLOWANCE:
      return 'common.insufficientAllowance'
    case OrderError.ZERO_AMOUNT:
      return 'trade.errors.amountTooSmallUnknownMinimum'
    case OrderError.INSUFFICIENT_VALID_TO:
      return 'limitOrder.errors.insufficientValidTo'
    case OrderError.EXCESSIVE_VALID_TO:
      return 'limitOrder.errors.excessiveValidTo'
    case OrderError.INVALID_NATIVE_SELL_TOKEN:
      return 'limitOrder.errors.nativeSellAssetNotSupported'
    case OrderError.SAME_BUY_AND_SELL_TOKEN:
    case OrderError.UNSUPPORTED_TOKEN:
      return 'trade.errors.unsupportedTradePair'
    case OrderError.SELL_AMOUNT_DOES_NOT_COVER_FEE:
      return 'trade.errors.sellAmountDoesNotCoverFee'
    case OrderError.NO_LIQUIDITY:
      return 'limitOrder.errors.insufficientLiquidity'
    case OrderError.INVALID_APP_DATA:
    case OrderError.APP_DATA_HASH_MISMATCH:
    case OrderError.APPDATA_FROM_MISMATCH:
    case OrderError.DUPLICATED_ORDER:
    case OrderError.QUOTE_NOT_FOUND:
    case OrderError.QUOTE_NOT_VERIFIED:
    case OrderError.INVALID_QUOTE:
    case OrderError.MISSING_FROM:
    case OrderError.WRONG_OWNER:
    case OrderError.INVALID_EIP1271SIGNATURE:
    case OrderError.INVALID_SIGNATURE:
    case OrderError.SELL_AMOUNT_OVERFLOW:
    case OrderError.TRANSFER_SIMULATION_FAILED:
    case OrderError.INCOMPATIBLE_SIGNING_SCHEME:
    case OrderError.TOO_MANY_LIMIT_ORDERS:
    case OrderError.TOO_MUCH_GAS:
    case OrderError.UNSUPPORTED_BUY_TOKEN_DESTINATION:
    case OrderError.UNSUPPORTED_SELL_TOKEN_SOURCE:
    case OrderError.UNSUPPORTED_ORDER_TYPE:
      return 'trade.errors.quoteError'
    default:
      assertUnreachable(errorType)
  }
}
