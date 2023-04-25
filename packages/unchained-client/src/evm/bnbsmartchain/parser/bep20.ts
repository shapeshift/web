import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { BigNumber } from 'ethers'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../../types'
import type { SubParser, Tx, TxSpecific } from '../../parser/types'
import { getSigHash } from '../../parser/utils'
import { bep20 } from './abi/bep20'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'bep20'
  assetId: string
  value?: string
}

interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcBatchProvider
}

export class Parser<T extends Tx> implements SubParser<T> {
  provider: ethers.providers.JsonRpcBatchProvider

  readonly chainId: ChainId
  readonly abiInterface = new ethers.utils.Interface(bep20)

  readonly supportedFunctions = {
    approveSigHash: this.abiInterface.getSighash('approve'),
  }

  constructor(args: ParserArgs) {
    this.provider = args.provider
    this.chainId = args.chainId
  }

  async parse(tx: T): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const data: TxMetadata = {
      assetId: toAssetId({
        chainId: this.chainId,
        assetNamespace: 'bep20',
        assetReference: tx.to,
      }),
      method: decoded.name,
      parser: 'bep20',
    }

    switch (txSigHash) {
      case this.supportedFunctions.approveSigHash: {
        const amount = decoded.args.amount as BigNumber
        const value = amount.toString()
        if (amount.isZero()) {
          return await Promise.resolve({ data: { ...data, method: 'revoke', value } })
        }
        return await Promise.resolve({ data: { ...data, value } })
      }
      default:
        return await Promise.resolve({ data })
    }
  }
}
