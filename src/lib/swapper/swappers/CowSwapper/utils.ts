import type { ChainId } from '@shapeshiftoss/caip'
import type { Trade } from 'lib/swapper/api'
import type { CowTrade } from 'lib/swapper/swappers/CowSwapper/types'

export const isCowTrade = <C extends ChainId>(
  trade: CowTrade<C> | Trade<C>,
): trade is CowTrade<C> => Boolean((trade as CowTrade<C>).feeAmountInSellTokenCryptoBaseUnit)
