import { COWSWAP_SETTLEMENT_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import { Dex, TradeType } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { txInteractsWithContract } from '../../parser'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'cowswap'
}

export class Parser implements SubParser<Tx> {
  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, COWSWAP_SETTLEMENT_CONTRACT_MAINNET)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    return await Promise.resolve({
      trade: {
        dexName: Dex.CowSwap,
        type: TradeType.Trade,
      },
      data: {
        method: undefined,
        parser: 'cowswap',
      },
    })
  }
}
