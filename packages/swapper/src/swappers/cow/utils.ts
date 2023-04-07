import { ChainId } from '@shapeshiftoss/caip'

import { Trade } from '../../api'
import { CowTrade } from './types'

export const isCowTrade = <C extends ChainId>(
  trade: CowTrade<C> | Trade<C>,
): trade is CowTrade<C> => Boolean((trade as CowTrade<C>).feeAmountInSellTokenCryptoBaseUnit)
