import type { AssetId, ChainId } from '@shapeshiftoss/caip'

import { TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'
import type { ParsedTx, SubParser, Tx } from './types'

export * from './types'

export interface TransactionParserArgs {
  chainId: ChainId
  assetId: AssetId
}

export class TransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId

  private parsers: SubParser<T>[] = []

  constructor(args: TransactionParserArgs) {
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
    const parserResult = await (async () => {
      for (const parser of this.parsers) {
        const result = await parser.parse(tx, address)
        if (result) return result
      }
    })()

    const parsedTx: ParsedTx = {
      address,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      // all transactions from unchained are finalized with at least 1 confirmation (unused throughout web)
      confirmations: 1,
      status: this.getStatus(tx),
      trade: parserResult?.trade,
      transfers: parserResult?.transfers ?? [],
      txid: tx.txid,
    }

    // network fee
    if (tx.feePayer === address && tx.fee) {
      parsedTx.fee = { assetId: this.assetId, value: BigInt(tx.fee).toString() }
    }

    tx.nativeTransfers?.forEach(nativeTransfer => {
      const { amount, fromUserAccount, toUserAccount } = nativeTransfer

      // send amount
      if (nativeTransfer.fromUserAccount === address) {
        parsedTx.transfers = aggregateTransfer({
          assetId: this.assetId,
          from: fromUserAccount ?? '',
          to: toUserAccount ?? '',
          transfers: parsedTx.transfers,
          type: TransferType.Send,
          value: BigInt(amount).toString(),
        })
      }

      // receive amount
      if (nativeTransfer.toUserAccount === address) {
        parsedTx.transfers = aggregateTransfer({
          assetId: this.assetId,
          from: fromUserAccount ?? '',
          to: toUserAccount ?? '',
          transfers: parsedTx.transfers,
          type: TransferType.Receive,
          value: BigInt(amount).toString(),
        })
      }
    })

    return parsedTx
  }

  private getStatus(tx: T): TxStatus {
    if (tx.transactionError) return TxStatus.Failed
    return TxStatus.Confirmed
  }
}
