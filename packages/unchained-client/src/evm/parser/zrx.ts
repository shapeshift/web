import { BaseTxMetadata, Dex, TradeType } from '../../types'
import { type SubParser, type TxSpecific, txInteractsWithContract } from '.'
import { ZRX_PROXY_CONTRACT } from './constants'
import { type Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'zrx'
}

export class Parser implements SubParser<Tx> {
  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, ZRX_PROXY_CONTRACT)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    return {
      trade: {
        dexName: Dex.Zrx,
        type: TradeType.Trade,
      },
      data: {
        method: undefined, // TODO - add zrx ABI and decode
        parser: 'zrx',
      },
    }
  }
}
