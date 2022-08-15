import { ethers } from 'ethers'

import { Tx } from '../../../generated/ethereum'
import { getSigHash, SubParser, txInteractsWithContract, TxSpecific } from '../../parser'
import FOXY_STAKING_ABI from './abi/foxyStaking'
import { FOXY_STAKING_CONTRACT } from './constants'

export class Parser implements SubParser<Tx> {
  readonly abiInterface = new ethers.utils.Interface(FOXY_STAKING_ABI)

  readonly supportedFunctions = {
    stakeSigHash: this.abiInterface.getSighash('stake(uint256,address)'),
    unstakeSigHash: this.abiInterface.getSighash('unstake'),
    instantUnstakeSigHash: this.abiInterface.getSighash('instantUnstake'),
    claimWithdrawSigHash: this.abiInterface.getSighash('claimWithdraw'),
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, FOXY_STAKING_CONTRACT)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    return {
      data: {
        method: decoded.name,
        parser: 'foxy',
      },
    }
  }
}
