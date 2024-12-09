import { assertUnreachable } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'

import { ExpiryOption, PriceDirection } from './constants'

export const expiryOptionToUnixTimestamp = (expiry: ExpiryOption): number => {
  switch (expiry) {
    case ExpiryOption.OneHour:
      return dayjs().add(1, 'hour').unix()
    case ExpiryOption.OneDay:
      return dayjs().add(1, 'day').unix()
    case ExpiryOption.ThreeDays:
      return dayjs().add(3, 'day').unix()
    case ExpiryOption.SevenDays:
      return dayjs().add(7, 'day').unix()
    case ExpiryOption.TwentyEightDays:
      return dayjs().add(28, 'day').unix()
    default:
      assertUnreachable(expiry)
  }
}

export const getOppositePriceDirection = (priceDirection: PriceDirection) => {
  return priceDirection === PriceDirection.BuyAssetDenomination
    ? PriceDirection.SellAssetDenomination
    : PriceDirection.BuyAssetDenomination
}
