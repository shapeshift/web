import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'
import { ethers } from 'ethers'

import { TxParser } from '../../types'
import { SubParser, TxSpecific } from '../types'
import FOXY_STAKING_ABI from './abi/foxyStaking'
import { FOXY_STAKING_CONTRACT } from './constants'
import { getSigHash, txInteractsWithContract } from './utils'

export class Parser implements SubParser {
  readonly abiInterface = new ethers.utils.Interface(FOXY_STAKING_ABI)

  readonly supportedFunctions = {
    stakeSigHash: this.abiInterface.getSighash('stake(uint256,address)'),
    unstakeSigHash: this.abiInterface.getSighash('unstake'),
    instantUnstakeSigHash: this.abiInterface.getSighash('instantUnstake'),
    claimWithdrawSigHash: this.abiInterface.getSighash('claimWithdraw')
  }

  async parse(tx: BlockbookTx): Promise<TxSpecific | undefined> {
    const txData = tx.ethereumSpecific?.data

    if (!txInteractsWithContract(tx, FOXY_STAKING_CONTRACT)) return
    if (!txData) return

    const txSigHash = getSigHash(txData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: txData })

    // failed to decode input data
    if (!decoded) return

    return {
      data: {
        method: decoded.name,
        parser: TxParser.Foxy
      }
    }
  }
}
