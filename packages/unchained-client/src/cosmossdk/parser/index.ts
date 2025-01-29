import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'

import { TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'
import type { ParsedTx, SubParser, Tx } from './types'
import { getAssetIdByDenom, metaData } from './utils'

export * from './types'

export interface BaseTransactionParserArgs {
  chainId: ChainId
  assetId: AssetId
}

export class BaseTransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId

  private parsers: SubParser<T>[] = []

  constructor(args: BaseTransactionParserArgs) {
    this.chainId = args.chainId
    this.assetId = args.assetId
  }

  /**
   * Register custom transaction sub parser to parse custom op return data
   *
   * _parsers should be registered from most generic first to most specific last_
   */
  registerParser(parser: SubParser<T>): void {
    this.parsers.unshift(parser)
  }

  protected registerParsers(parsers: SubParser<T>[]): void {
    parsers.forEach(parser => this.registerParser(parser))
  }

  async parse(tx: T, address: string): Promise<ParsedTx> {
    const parserResults = await (async () => {
      for (const parser of this.parsers) {
        const result = await parser.parse(tx, address)
        if (result) return result
      }
    })()

    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight ?? -1,
      blockTime: tx.timestamp ?? Math.floor(Date.now() / 1000),
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: this.getStatus(tx),
      transfers: parserResults?.transfers ?? [],
      txid: tx.txid,
      trade: parserResults?.trade,
      data: parserResults?.data,
    }

    tx.messages.forEach((msg, i) => {
      const { from, to, value, origin } = msg

      // We use origin for fees because some txs have a different from and origin addresses
      if (origin === address) {
        // network fee
        const fees = new BigNumber(tx.fee.amount)
        if (fees.gt(0)) {
          parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
        }
      }

      const assetId = getAssetIdByDenom(value?.denom, this.assetId)

      if (!assetId) return

      // attempt to get transaction metadata from the raw messages and events if not already found by a subparser
      if (i === 0 && !parsedTx.data) parsedTx.data = metaData(msg, tx.events[msg.index], assetId)

      const amount = new BigNumber(value?.amount ?? -1)

      if (from === address && amount.gte(0)) {
        parsedTx.transfers = aggregateTransfer({
          assetId,
          from,
          to,
          transfers: parsedTx.transfers,
          type: TransferType.Send,
          value: amount.toString(10),
          allowZeroValue: true,
        })
      }

      if (to === address && amount.gt(0)) {
        parsedTx.transfers = aggregateTransfer({
          assetId,
          from,
          to,
          transfers: parsedTx.transfers,
          type: TransferType.Receive,
          value: amount.toString(10),
        })
      }

      // special case for rune pool withdraw transfer (no message emitted so parsing of events for transfer is required)
      if (msg.type === 'deposit' && tx.events[msg.index]['rune_pool_withdraw']) {
        const transfer = tx.events[msg.index]['transfer']

        const regex = /^(?<value>\d+)(?<denom>[a-zA-Z]+)$/
        const match = transfer?.amount.match(regex)

        if (match?.groups) {
          const { value } = match.groups

          parsedTx.transfers = aggregateTransfer({
            assetId,
            from: transfer.sender,
            to: transfer.recipient,
            transfers: parsedTx.transfers,
            type: TransferType.Receive,
            value,
          })
        }
      }
    })

    return Promise.resolve(parsedTx)
  }

  private getStatus(tx: T): TxStatus {
    if (tx.events['0']?.error) return TxStatus.Failed
    if (tx.confirmations <= 0) return TxStatus.Pending
    if (tx.confirmations > 0) return TxStatus.Confirmed

    return TxStatus.Unknown
  }
}
