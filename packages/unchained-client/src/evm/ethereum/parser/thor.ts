import type { ChainId } from '@shapeshiftoss/caip'
import { avalancheChainId, ethChainId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import { Dex, TradeType } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { getSigHash, txInteractsWithContract } from '../../parser'
import { THOR_AVALANCHE_ABI } from './abi/thorAvalanche'
import { THOR_ETHEREUM_ABI } from './abi/thorEthereum'
import { THOR_ROUTER_CONTRACT_AVAX_MAINNET, THOR_ROUTER_CONTRACT_ETH_MAINNET } from './constants'

const SWAP_TYPES = ['SWAP', '=', 's']

export interface TxMetadata extends BaseTxMetadata {
  parser: 'thor'
}

export interface ParserArgs {
  chainId: ChainId
  rpcUrl: string
}

interface SupportedFunctions {
  depositSigHash: string
  transferOutSigHash: string
}

export class Parser implements SubParser<Tx> {
  readonly routerContract: string
  readonly abiInterface: ethers.utils.Interface
  readonly supportedFunctions: SupportedFunctions

  constructor(args: ParserArgs) {
    this.abiInterface = (() => {
      switch (args.chainId) {
        case ethChainId:
          return new ethers.utils.Interface(THOR_ETHEREUM_ABI)
        case avalancheChainId:
          return new ethers.utils.Interface(THOR_AVALANCHE_ABI)
        default:
          throw new Error(
            `chainId is not supported. (supported chainIds: ${ethChainId}, ${avalancheChainId})`,
          )
      }
    })()

    this.supportedFunctions = {
      depositSigHash: this.abiInterface.getSighash('deposit'),
      transferOutSigHash: this.abiInterface.getSighash('transferOut'),
    }

    // TODO: Router contract can change, use /inbound_addresses endpoint to determine current router contract.
    // We will also need to know all past router contract addresses if we intend on using receive address as the means for detection
    this.routerContract = (() => {
      switch (args.chainId) {
        case ethChainId:
          return THOR_ROUTER_CONTRACT_ETH_MAINNET
        case avalancheChainId:
          return THOR_ROUTER_CONTRACT_AVAX_MAINNET
        default:
          throw new Error(
            `chainId is not supported. (supported chainIds: ${ethChainId}, ${avalancheChainId})`,
          )
      }
    })()
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, this.routerContract)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const data: TxMetadata = {
      method: decoded.name,
      parser: 'thor',
    }

    const [type] = decoded.args.memo.split(':')

    if (SWAP_TYPES.includes(type) || type === 'OUT') {
      return await Promise.resolve({
        trade: { dexName: Dex.Thor, type: TradeType.Trade, memo: decoded.args.memo },
        data,
      })
    }

    if (type === 'REFUND') {
      return await Promise.resolve({
        trade: { dexName: Dex.Thor, type: TradeType.Refund, memo: decoded.args.memo },
        data,
      })
    }

    // memo type not supported
    return
  }
}
