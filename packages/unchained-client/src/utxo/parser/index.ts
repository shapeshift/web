import { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { utxo } from '@shapeshiftoss/common-api'
import { BigNumber } from 'bignumber.js'

import { ParsedTx, TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'

export interface BaseTransactionParserArgs {
  chainId: ChainId
}

export class BaseTransactionParser<T extends utxo.Tx> {
  chainId: ChainId
  assetId: AssetId

  constructor(args: BaseTransactionParserArgs) {
    this.chainId = args.chainId
  }

  async parse(tx: T, address: string): Promise<ParsedTx> {
    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending,
      transfers: [],
      txid: tx.txid
    }

    tx.vin.forEach((vin) => {
      if (vin.addresses?.includes(address)) {
        // send amount
        const sendValue = new BigNumber(vin.value ?? 0)
        if (sendValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer(
            parsedTx.transfers,
            TransferType.Send,
            this.assetId,
            vin.addresses?.[0] ?? '',
            tx.vout[0].addresses?.[0] ?? '',
            sendValue.toString(10)
          )
        }

        // network fee
        const fees = new BigNumber(tx.fee ?? 0)
        if (fees.gt(0)) {
          parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
        }
      }
    })

    tx.vout.forEach((vout) => {
      if (vout.addresses?.includes(address)) {
        // receive amount
        const receiveValue = new BigNumber(vout.value ?? 0)
        if (receiveValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer(
            parsedTx.transfers,
            TransferType.Receive,
            this.assetId,
            tx.vin[0].addresses?.[0] ?? '',
            vout.addresses?.[0] ?? '',
            receiveValue.toString(10)
          )
        }
      }
    })

    return parsedTx
  }
}
