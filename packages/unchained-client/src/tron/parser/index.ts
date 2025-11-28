import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'

import type { ParsedTx, Transfer, TxStatus } from '../../types'
import { TransferType, TxStatus as Status } from '../../types'
import type { TronTx } from '../types'

export interface TransactionParserArgs {
  assetId: AssetId
  chainId: ChainId
}

export class TransactionParser {
  assetId: AssetId
  chainId: ChainId
  assetReference: string

  constructor(args: TransactionParserArgs) {
    this.assetId = args.assetId
    this.chainId = args.chainId
    const { assetReference } = fromAssetId(this.assetId)
    this.assetReference = assetReference
  }

  parse(tx: TronTx, address: string): Promise<ParsedTx> {
    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash || '',
      blockHeight: tx.blockHeight || 0,
      blockTime: tx.timestamp ? Math.floor(tx.timestamp / 1000) : 0,
      chainId: this.chainId,
      confirmations: tx.confirmations || 0,
      status: this.getStatus(tx),
      transfers: this.getTransfers(tx, address),
      txid: tx.txID,
      trade: undefined,
      fee: {
        assetId: this.assetId,
        value: tx.fee || '0',
      },
    }

    return Promise.resolve(parsedTx)
  }

  private getStatus(tx: TronTx): TxStatus {
    if (tx.confirmations && tx.confirmations > 0) {
      return Status.Confirmed
    }
    return Status.Pending
  }

  private getTransfers(tx: TronTx, address: string): Transfer[] {
    const transfers: Transfer[] = []

    if (!tx.raw_data || !tx.raw_data.contract) {
      return transfers
    }

    for (const contract of tx.raw_data.contract) {
      if (contract.type === 'TransferContract') {
        const { owner_address, to_address, amount } = contract.parameter.value
        const value = String(amount || 0)

        if (owner_address === address) {
          transfers.push({
            assetId: this.assetId,
            from: owner_address || '',
            to: to_address || '',
            type: TransferType.Send,
            totalValue: value,
            components: [{ value }],
          })
        } else if (to_address === address) {
          transfers.push({
            assetId: this.assetId,
            from: owner_address || '',
            to: to_address || '',
            type: TransferType.Receive,
            totalValue: value,
            components: [{ value }],
          })
        }
      }
    }

    return transfers
  }
}
