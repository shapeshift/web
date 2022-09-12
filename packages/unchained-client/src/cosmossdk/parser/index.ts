import {
  AssetId,
  ChainId,
  cosmosAssetId,
  osmosisAssetId,
  thorchainAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { Logger } from '@shapeshiftoss/logger'
import { BigNumber } from 'bignumber.js'

import { TransferType, TxStatus } from '../../types'
import { aggregateTransfer } from '../../utils'
import { ParsedTx, Tx } from './types'
import { metaData } from './utils'

export * from './types'

const logger = new Logger({
  namespace: ['unchained-client', 'cosmossdk', 'parser'],
  level: process.env.LOG_LEVEL,
})

const assetIdByDenom = new Map<string, AssetId>([
  ['uatom', cosmosAssetId],
  ['uosmo', osmosisAssetId],
  ['rune', thorchainAssetId],
])

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

    parsedTx.data = metaData(tx.messages[0], this.assetId)

    tx.messages.forEach(({ from = '', to = '', value, origin }) => {
      const amount = new BigNumber(value?.amount ?? 0)

      const assetId = (() => {
        if (!value?.denom) return this.assetId
        if (assetIdByDenom.has(value.denom)) return assetIdByDenom.get(value.denom) as AssetId

        const [assetNamespace, assetReference] = value.denom.split('/')
        if (assetNamespace === 'ibc' && assetReference) {
          return toAssetId({ chainId: this.chainId, assetNamespace, assetReference })
        }

        logger.warn(`unknown denom: ${value.denom}, defaulting to: ${this.assetId}`)
        return this.assetId
      })()

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

      // We use origin for fees because some txs have a different from and origin addresses
      if (origin === address) {
        // network fee
        const fees = new BigNumber(tx.fee.amount)
        if (fees.gt(0)) {
          parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
        }
      }
    })

    return parsedTx
  }
}
