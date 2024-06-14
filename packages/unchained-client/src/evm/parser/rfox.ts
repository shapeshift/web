import type { AssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, TxSpecific } from '.'
import { getSigHash, txInteractsWithContract } from '.'
import { RFOX_ABI } from './abi/rfox'
import type { Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'rfox'
  assetId: AssetId
  value?: string
}

export interface ParserArgs {
  proxyContract: string
  stakingAssetId: AssetId
}

export class Parser implements SubParser<Tx> {
  private readonly proxyContract
  readonly abiInterface = new ethers.Interface(RFOX_ABI)
  private readonly stakingAssetId: AssetId

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

    return await Promise.resolve({
      data: {
        method: decoded.name,
        parser: 'rfox',
        assetId: this.stakingAssetId,
      },
    })
  }
}
