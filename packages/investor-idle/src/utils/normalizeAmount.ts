import BigNumber from 'bignumber.js'

import { bnOrZero } from './bignumber'

export const normalizeAmount = (n: number | string, decimals = 18): BigNumber => {
  return bnOrZero(
    bnOrZero(n)
      .times(bnOrZero(`1e${decimals}`))
      .integerValue(BigNumber.ROUND_FLOOR)
      .toFixed(0)
  )
}
