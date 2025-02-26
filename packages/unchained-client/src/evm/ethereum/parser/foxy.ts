import { FOXY_STAKING_ABI, FOXY_STAKING_CONTRACT } from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { getSigHash, txInteractsWithContract } from '../../parser'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'foxy'
}

export class Parser implements SubParser<Tx> {
  readonly abiInterface = new ethers.Interface(FOXY_STAKING_ABI)

  readonly supportedFunctions = {
    stakeSigHash: this.abiInterface.getFunction('stake(uint256,address)')!.selector,
    unstakeSigHash: this.abiInterface.getFunction('unstake')!.selector,
    instantUnstakeSigHash: this.abiInterface.getFunction('instantUnstake')!.selector,
    claimWithdrawSigHash: this.abiInterface.getFunction('claimWithdraw')!.selector,
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
