import type { BaseTxMetadata, StandardTx } from '../../../types'
import type { SubParser, Tx, TxSpecific } from '../../parser'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'rfox'
  type: 'thorchain'
  epoch: number
  stakingAddress: string
  ipfsHash: string
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export class Parser implements SubParser<Tx> {
  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.memo?.startsWith('rFOX reward')) return

    const match = tx.memo.match(
      /Staking Address: (?<stakingAddress>\w+)\) - Epoch #(?<epoch>\d+) \(IPFS Hash: (?<ipfsHash>\w+)\)/,
    )

    if (!match?.groups) return

    const { epoch, stakingAddress, ipfsHash } = match.groups

    if (!epoch || !stakingAddress || !ipfsHash) return

    return await Promise.resolve({
      data: {
        parser: 'rfox',
        type: 'thorchain',
        method: 'reward',
        epoch: parseInt(match.groups.epoch, 10),
        stakingAddress: match.groups.stakingAddress,
        ipfsHash: match.groups.ipfsHash,
      },
    })
  }
}
