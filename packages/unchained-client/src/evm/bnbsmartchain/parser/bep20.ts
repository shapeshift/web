import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { I_BEP20_ABI } from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../../types'
import type { SubParser, Tx, TxSpecific } from '../../parser/types'
import { getSigHash } from '../../parser/utils'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'bep20'
  assetId: string
  value?: string
}

interface ParserArgs {
  chainId: ChainId
  provider: ethers.JsonRpcProvider
}

export class Parser<T extends Tx> implements SubParser<T> {
  provider: ethers.JsonRpcProvider

  readonly chainId: ChainId
  readonly abiInterface = new ethers.Interface(I_BEP20_ABI)

  readonly supportedFunctions = {
    approveSigHash: this.abiInterface.getFunction('approve')!.selector,
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
        const amount = decoded.args.amount as BigInt
        const value = amount.toString()
        if (amount === 0n) {
          return await Promise.resolve({ data: { ...data, method: 'revoke', value } })
        }
        return await Promise.resolve({ data: { ...data, value } })
      }
      default:
        return await Promise.resolve({ data })
    }
  }
}
