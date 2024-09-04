import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { ERC20_ABI } from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, Tx, TxSpecific } from './types'
import { getSigHash } from './utils'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'erc20'
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
  readonly abiInterface = new ethers.Interface(ERC20_ABI)

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
        assetNamespace: 'erc20',
        assetReference: tx.to,
      }),
      method: decoded.name,
      parser: 'erc20',
    }

    switch (txSigHash) {
      case this.supportedFunctions.approveSigHash: {
        const amount = decoded.args.amount as BigInt
        const value = amount.toString()
        if (amount === 0n) {
          return await Promise.resolve({ data: { ...data, method: 'revoke', value } })
        }
        return await Promise.resolve({ data: { ...data, value: value.toString() } })
      }
      default:
        return await Promise.resolve({ data })
    }
  }
}
