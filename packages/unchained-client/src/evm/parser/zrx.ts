import type { BaseTxMetadata } from '../../types'
import { Dex, TradeType } from '../../types'
import type { SubParser, TxSpecific } from '.'
import { txInteractsWithContract } from '.'
import type { Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'zrx'
}

export interface ParserArgs {
  proxyContract: string
}

export class Parser implements SubParser<Tx> {
  private readonly proxyContract

  constructor(args: ParserArgs) {
    this.proxyContract = args.proxyContract
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, this.proxyContract)) return
    if (!(tx.tokenTransfers && tx.tokenTransfers.length)) return

    return await Promise.resolve({
      trade: {
        dexName: Dex.Zrx,
        type: TradeType.Trade,
      },
      data: {
        method: undefined, // TODO - add zrx ABI and decode
        parser: 'zrx',
      },
    })
  }
}
