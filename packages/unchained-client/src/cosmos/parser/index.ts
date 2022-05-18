import { ASSET_REFERENCE, AssetId, ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'

import { Status, TransferType } from '../../types'
import { Tx as CosmosTx } from '../index'
import { ParsedTx } from '../types'
import { valuesFromMsgEvents } from './utils'

export interface TransactionParserArgs {
  chainId: ChainId
}

export class TransactionParser {
  chainId: ChainId
  assetId: AssetId

  constructor(args: TransactionParserArgs) {
    this.chainId = args.chainId

    this.assetId = toAssetId({
      ...fromChainId(this.chainId),
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Cosmos
    })
  }

  async parse(tx: CosmosTx, address: string): Promise<ParsedTx> {
    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight ?? -1,
      blockTime: tx.timestamp ?? Math.floor(Date.now() / 1000),
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? Status.Confirmed : Status.Pending, // TODO: handle failed case
      transfers: [],
      txid: tx.txid
    }

    // For simplicity and to limit scope we assume 1 message per transaction
    // This works ok enough for transactions we generate but way may want to improve in the future
    const { from, to, data, value, origin } = valuesFromMsgEvents(
      tx.messages[0],
      tx.events,
      this.assetId
    )

    parsedTx.data = data

    if (from === address && value.gt(0)) {
      parsedTx.transfers = [
        {
          type: TransferType.Send,
          assetId: this.assetId,
          from,
          to,
          totalValue: value.toString(10),
          components: [{ value: value.toString(10) }]
        }
      ]
    }

    if (to === address && value.gt(0)) {
      parsedTx.transfers = [
        {
          type: TransferType.Receive,
          assetId: this.assetId,
          from,
          to,
          totalValue: value.toString(10),
          components: [{ value: value.toString(10) }]
        }
      ]
    }

    // We use origin for fees because some txs have a different from and origin addresses
    if (origin === address) {
      // network fee
      const fees = new BigNumber(tx.fee.amount)
      if (fees.gt(0)) {
        parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
      }
    }

    return parsedTx
  }
}
