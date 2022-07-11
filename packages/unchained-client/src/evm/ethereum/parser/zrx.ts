import { EthereumTx } from '../../../generated/ethereum'
import { Dex, TradeType, TxParser } from '../../../types'
import { SubParser, txInteractsWithContract, TxSpecific } from '../../parser'
import { ZRX_PROXY_CONTRACT } from './constants'

export class Parser implements SubParser<EthereumTx> {
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
