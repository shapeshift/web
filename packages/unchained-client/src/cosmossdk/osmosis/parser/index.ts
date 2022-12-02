import { osmosisAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/osmosis'
import { Dex, TradeType } from '../../../types'
import { BaseTransactionParser, BaseTransactionParserArgs } from '../../parser'
import { ParsedTx } from '../../parser/types'

export type TransactionParserArgs = BaseTransactionParserArgs

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = osmosisAssetId
  }

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
