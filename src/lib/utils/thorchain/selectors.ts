import { bnOrZero } from 'lib/bignumber/bignumber'

import { THORCHAIN_BLOCK_TIME_SECONDS } from './constants'
import type { ThorchainMimir } from './types'

export const selectLiquidityLockupTime = (mimirData: ThorchainMimir): number => {
  const liquidityLockupBlocks = mimirData.LIQUIDITYLOCKUPBLOCKS as number | undefined
  return Number(bnOrZero(liquidityLockupBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0))
}

export const selectRunePoolMaturityTime = (mimirData: ThorchainMimir): number => {
  const runePoolDepositMaturityBlocks = mimirData.RUNEPOOLDEPOSITMATURITYBLOCKS as
    | number
    | undefined

  return Number(
    bnOrZero(runePoolDepositMaturityBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0),
  )
}
