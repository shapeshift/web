import { THORCHAIN_BLOCK_TIME_SECONDS } from './constants'
import type { ThorchainMimir } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

export const selectLiquidityLockupTime = (mimirData: ThorchainMimir): number => {
  const liquidityLockupBlocks = mimirData.LIQUIDITYLOCKUPBLOCKS
  return Number(bnOrZero(liquidityLockupBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0))
}

export const selectRunePoolMaturityTime = (mimirData: ThorchainMimir): number => {
  const runePoolDepositMaturityBlocks = mimirData.RUNEPOOLDEPOSITMATURITYBLOCKS

  return Number(
    bnOrZero(runePoolDepositMaturityBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0),
  )
}
