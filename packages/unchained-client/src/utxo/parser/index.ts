import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { utxo } from '@shapeshiftoss/common-api'
import { BigNumber } from 'bignumber.js'

import type { ParsedTx } from '../../types'
import { TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'

export interface BaseTransactionParserArgs {
  chainId: ChainId
  assetId: AssetId
}

export class BaseTransactionParser<T extends utxo.Tx> {
  chainId: ChainId
  assetId: AssetId

  constructor(args: BaseTransactionParserArgs) {
    this.chainId = args.chainId
    this.assetId = args.assetId
  }

  parse(tx: T, address: string): Promise<ParsedTx> {
    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending,
      transfers: [],
      txid: tx.txid,
    }

    tx.vin.forEach(vin => {
      if (vin.addresses?.includes(address)) {
        // send amount
        const sendValue = new BigNumber(vin.value ?? 0)
        if (sendValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer({
            assetId: this.assetId,
            from: vin.addresses?.[0] ?? '',
            to: tx.vout[0].addresses?.[0] ?? '',
            transfers: parsedTx.transfers,
            type: TransferType.Send,
            value: sendValue.toString(10),
          })
        }

        // network fee
        const fees = new BigNumber(tx.fee ?? 0)
        if (fees.gt(0)) {
          parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
        }
      }
    })

    tx.vout.forEach(vout => {
      if (vout.addresses?.includes(address)) {
        // receive amount
        const receiveValue = new BigNumber(vout.value ?? 0)
        if (receiveValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer({
            assetId: this.assetId,
            from: tx.vin[0].addresses?.[0] ?? '',
            to: vout.addresses?.[0] ?? '',
            transfers: parsedTx.transfers,
            type: TransferType.Receive,
            value: receiveValue.toString(10),
          })
        }
      }
    })

    return Promise.resolve(parsedTx)
  }
}
