import { Tx } from '../../../generated/ethereum'
import { Dex, TradeType } from '../../../types'
import { SubParser, txInteractsWithContract, TxSpecific } from '../../parser'
import { COWSWAP_CONTRACT_MAINNET } from './constants'

export class Parser implements SubParser<Tx> {
  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, COWSWAP_CONTRACT_MAINNET)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    return {
      trade: {
        dexName: Dex.CowSwap,
        type: TradeType.Trade
      },
      data: {
        method: undefined,
        parser: 'cowswap'
      }
    }
  }
}
