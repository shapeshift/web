import { Tx as AvalancheTx } from '../../generated/avalanche'
import { Tx as EthTx } from '../../generated/ethereum'
import { Dex, TradeType } from '../../types'
import { SubParser, txInteractsWithContract, TxSpecific } from '.'
import { ZRX_PROXY_CONTRACT } from './constants'

type Tx = EthTx | AvalancheTx

export class Parser implements SubParser<Tx> {
  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, ZRX_PROXY_CONTRACT)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    return {
      trade: {
        dexName: Dex.Zrx,
        type: TradeType.Trade
      },
      data: {
        method: undefined, // TODO - add zrx ABI and decode
        parser: 'zrx'
      }
    }
  }
}
