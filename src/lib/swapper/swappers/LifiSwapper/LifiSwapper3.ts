import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Swapper3 } from 'lib/swapper/api'
import { getUnsignedTx } from 'lib/swapper/swappers/LifiSwapper/getUnsignedTx/getUnsignedTx'

import type { LifiTradeQuote } from './utils/types'

export const lifi: Swapper3 = {
  getUnsignedTx: async (tradeQuote: LifiTradeQuote<false>, wallet: HDWallet) => {
    const { selectedLifiRoute } = tradeQuote
    const { accountNumber, sellAsset } = tradeQuote.steps[0]

    const unsignedTx = await getUnsignedTx({
      selectedLifiRoute,
      accountNumber,
      sellAsset,
      wallet,
    })

    return unsignedTx
  },
}
