import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'
import { AssetNamespace, AssetReference, caip2, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'

import { Status, TransferType, Tx as ParsedTx } from '../../types'
import { aggregateTransfer } from '../../utils'
import { Network } from '../types'
import { toNetworkType } from './utils'

export interface TransactionParserArgs {
  network?: Network
  rpcUrl: string
}

export class TransactionParser {
  network: Network

  constructor(args: TransactionParserArgs) {
    this.network = args.network ?? 'mainnet'
  }

  async parse(tx: BlockbookTx, address: string): Promise<ParsedTx> {
    const caip19Bitcoin = caip19.toCAIP19({
      chain: ChainTypes.Bitcoin,
      network: toNetworkType(this.network),
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Bitcoin
    })

    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.blockTime,
      caip2: caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network: toNetworkType(this.network) }),
      chainId: caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network: toNetworkType(this.network) }),
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? Status.Confirmed : Status.Pending,
      transfers: [],
      txid: tx.txid
    }

    tx.vin.forEach((vin) => {
      if (vin.isAddress && vin.addresses?.includes(address)) {
        // send amount
        const sendValue = new BigNumber(vin.value ?? 0)
        if (sendValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer(
            parsedTx.transfers,
            TransferType.Send,
            caip19Bitcoin,
            vin.addresses?.[0] ?? '',
            tx.vout[0].addresses?.[0] ?? '',
            sendValue.toString(10)
          )
        }

        // network fee
        const fees = new BigNumber(tx.fees ?? 0)
        if (fees.gt(0)) {
          parsedTx.fee = { caip19: caip19Bitcoin, assetId: caip19Bitcoin, value: fees.toString(10) }
        }
      }
    })

    tx.vout.forEach((vout) => {
      if (vout.isAddress && vout.addresses?.includes(address)) {
        // receive amount
        const receiveValue = new BigNumber(vout.value ?? 0)
        if (receiveValue.gt(0)) {
          parsedTx.transfers = aggregateTransfer(
            parsedTx.transfers,
            TransferType.Receive,
            caip19Bitcoin,
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
