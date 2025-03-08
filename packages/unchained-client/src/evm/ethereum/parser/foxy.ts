import { FOXY_STAKING_ABI, FOXY_STAKING_CONTRACT } from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { getSigHash, txInteractsWithContract } from '../../parser'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'foxy'
}

interface SupportedFunctions {
  stakeSigHash: string
  unstakeSigHash: string
  instantUnstakeSigHash: string
  claimWithdrawSigHash: string
}

export class Parser implements SubParser<Tx> {
  readonly abiInterface = new ethers.Interface(FOXY_STAKING_ABI)
  private readonly supportedFunctions: SupportedFunctions

  constructor() {
    const stakeSigHash = this.abiInterface.getFunction('stake(uint256,address)')?.selector
    const unstakeSigHash = this.abiInterface.getFunction('unstake')?.selector
    const instantUnstakeSigHash = this.abiInterface.getFunction('instantUnstake')?.selector
    const claimWithdrawSigHash = this.abiInterface.getFunction('claimWithdraw')?.selector

    if (!(stakeSigHash && unstakeSigHash && instantUnstakeSigHash && claimWithdrawSigHash)) {
      throw new Error('Failed to get function selectors')
    }

    this.supportedFunctions = {
      stakeSigHash,
      unstakeSigHash,
      instantUnstakeSigHash,
      claimWithdrawSigHash,
    }
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, FOXY_STAKING_CONTRACT)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    return await Promise.resolve({
      data: {
        method: decoded.name,
        parser: 'foxy',
      },
    })
  }
}
