import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, TxSpecific } from '.'
import { getSigHash, txInteractsWithContract } from '.'
import type { Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'rfox'
  type: 'evm'
  assetId: AssetId
  value?: string
  runeAddress?: string
  claimIndex?: number
}

export interface ParserArgs {
  proxyContract: string
  stakingAssetId: AssetId
}

export class Parser implements SubParser<Tx> {
  private readonly proxyContract
  private readonly stakingAssetId: AssetId

  readonly abiInterface = new ethers.Interface(RFOX_ABI)

  readonly supportedFunctions = {
    stake: this.abiInterface.getFunction('stake')!.selector,
    unstake: this.abiInterface.getFunction('unstake')!.selector,
    withdrawClaim: this.abiInterface.getFunction('withdraw(uint256)')!.selector,
    withdraw: this.abiInterface.getFunction('withdraw()')!.selector,
    setRuneAddress: this.abiInterface.getFunction('setRuneAddress')!.selector,
  }

  constructor(args: ParserArgs) {
    this.proxyContract = args.proxyContract
    this.stakingAssetId = args.stakingAssetId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, this.proxyContract)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    if (!decoded) return

    const data: TxMetadata = {
      method: decoded.name,
      parser: 'rfox',
      type: 'evm',
      assetId: this.stakingAssetId,
    }

    switch (txSigHash) {
      case this.supportedFunctions.unstake:
        const amount = decoded.args.amount as BigInt
        return await Promise.resolve({
          data: { ...data, method: `${data.method}Request`, value: amount.toString() },
        })
      case this.supportedFunctions.stake:
      case this.supportedFunctions.setRuneAddress:
        const runeAddress = decoded.args.runeAddress as string
        return await Promise.resolve({ data: { ...data, runeAddress } })
      case this.supportedFunctions.withdrawClaim:
        const index = decoded.args.index as BigInt
        return await Promise.resolve({ data: { ...data, claimIndex: Number(index) } })
      default:
        return await Promise.resolve({ data })
    }
  }
}
