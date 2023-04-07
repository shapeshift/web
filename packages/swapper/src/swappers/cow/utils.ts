import type { ChainId } from '@shapeshiftoss/caip'

import type { Trade } from '../../api'
import type { CowTrade } from './types'

export const isCowTrade = <C extends ChainId>(
  trade: CowTrade<C> | Trade<C>,
): trade is CowTrade<C> => Boolean((trade as CowTrade<C>).feeAmountInSellTokenCryptoBaseUnit)
