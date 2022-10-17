import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'

import { TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'
import { ParsedTx, Tx } from './types'
import { getAssetIdByDenom, metaData } from './utils'

export * from './types'

export interface BaseTransactionParserArgs {
  chainId: ChainId
}

export class BaseTransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId

  constructor(args: BaseTransactionParserArgs) {
    this.chainId = args.chainId
  }

  async parse(tx: T, address: string): Promise<ParsedTx> {
    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight ?? -1,
      blockTime: tx.timestamp ?? Math.floor(Date.now() / 1000),
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending, // TODO: handle failed case
      transfers: [],
      txid: tx.txid,
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
      if (i === 0) parsedTx.data = metaData(msg, tx.events[String(i)], assetId)

      const amount = new BigNumber(value?.amount ?? 0)

      if (from === address && amount.gt(0)) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          assetId,
          from,
          to,
          amount.toString(10),
        )
      }

      if (to === address && amount.gt(0)) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          assetId,
          from,
          to,
          amount.toString(10),
        )
      }
    })

    return parsedTx
  }
}
