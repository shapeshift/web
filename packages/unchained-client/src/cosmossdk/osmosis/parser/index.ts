import type { Tx } from '../../../generated/osmosis'
import { Dex, TradeType } from '../../../types'
import { BaseTransactionParser } from '../../parser'
import type { ParsedTx } from '../../parser/types'

export class TransactionParser extends BaseTransactionParser<Tx> {
  async parse(tx: Tx, address: string): Promise<ParsedTx> {
    const parsedTx = await super.parse(tx, address)

    if (parsedTx.data?.method === 'swap_exact_amount_in') {
      parsedTx.trade = {
        dexName: Dex.Osmosis,
        type: TradeType.Trade,
      }
    }

    return parsedTx
  }
}
