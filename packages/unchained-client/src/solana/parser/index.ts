import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import { toBaseUnit } from '@shapeshiftoss/utils'

import { TransferType, TxStatus } from '../../types'
import type { AggregateTransferArgs } from '../../utils'
import { aggregateTransfer } from '../../utils'
import type { Api } from '..'
import type { ParsedTx, SubParser, Tx } from './types'
import { TokenStandard } from './types'

export * from './types'

export interface TransactionParserArgs {
  chainId: ChainId
  assetId: AssetId
  api: Api
}

export class TransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId
  api: Api

  private parsers: SubParser<T>[] = []

  constructor(args: TransactionParserArgs) {
    this.chainId = args.chainId
    this.assetId = args.assetId
    this.api = args.api
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
    if (tx.fee && address === tx.feePayer) {
      parsedTx.fee = { assetId: this.assetId, value: BigInt(tx.fee).toString() }
    }

    tx.nativeTransfers?.forEach(nativeTransfer => {
      const { amount, fromUserAccount, toUserAccount } = nativeTransfer

      const makeTransferArgs = (type: TransferType): AggregateTransferArgs => ({
        assetId: this.assetId,
        from: fromUserAccount ?? '',
        to: toUserAccount ?? '',
        transfers: parsedTx.transfers,
        type,
        value: BigInt(amount).toString(),
      })

      // send amount
      if (address === nativeTransfer.fromUserAccount) {
        parsedTx.transfers = aggregateTransfer(makeTransferArgs(TransferType.Send))
      }

      // receive amount
      if (address === nativeTransfer.toUserAccount) {
        parsedTx.transfers = aggregateTransfer(makeTransferArgs(TransferType.Receive))
      }
    })

    for (const tokenTransfer of tx.tokenTransfers ?? []) {
      const { tokenAmount, fromUserAccount, toUserAccount, mint, tokenStandard } = tokenTransfer

      // only parse fungible tokens
      if (tokenStandard !== TokenStandard.Fungible) continue

      try {
        const token = await this.api.getToken({ id: mint })

        const assetId = toAssetId({
          chainId: this.chainId,
          assetNamespace: ASSET_NAMESPACE.splToken,
          assetReference: mint,
        })

        const makeTransferArgs = (type: TransferType): AggregateTransferArgs => ({
          assetId,
          from: fromUserAccount ?? '',
          to: toUserAccount ?? '',
          token: {
            decimals: token.decimals,
            contract: token.id,
            name: token.name,
            symbol: token.symbol,
          },
          transfers: parsedTx.transfers,
          type,
          value: toBaseUnit(tokenAmount, token.decimals).toString(),
        })

        // token send amount
        if (address === fromUserAccount) {
          parsedTx.transfers = aggregateTransfer(makeTransferArgs(TransferType.Send))
        }

        // token receive amount
        if (address === toUserAccount) {
          parsedTx.transfers = aggregateTransfer(makeTransferArgs(TransferType.Receive))
        }
      } catch (err) {
        console.warn(`failed to parse token transfer: ${tokenTransfer}: ${err}`)
      }
    }

    return parsedTx
  }

  private getStatus(tx: T): TxStatus {
    if (tx.transactionError) return TxStatus.Failed
    return TxStatus.Confirmed
  }
}
