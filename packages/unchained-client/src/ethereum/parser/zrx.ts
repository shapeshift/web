import { EthereumTx } from '../../generated/ethereum'
import { Dex, TradeType, TxParser } from '../../types'
import { SubParser, TxSpecific } from '../types'
import { ZRX_PROXY_CONTRACT } from './constants'
import { txInteractsWithContract } from './utils'

export class Parser implements SubParser {
  async parse(tx: EthereumTx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, ZRX_PROXY_CONTRACT)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    const trade = {
      dexName: Dex.Zrx,
      type: TradeType.Trade
    }

    const data = {
      method: undefined, // TODO - add zrx ABI and decode
      parser: TxParser.ZRX
    }

    return {
      trade,
      data
    }
  }
}
