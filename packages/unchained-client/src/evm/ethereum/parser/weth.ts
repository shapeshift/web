import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId, toAssetId } from '@shapeshiftoss/caip'
import {
  WETH_TOKEN_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS_ROPSTEN,
} from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTxMetadata } from '../../../types'
import { TransferType } from '../../../types'
import type { SubParser, TxSpecific } from '../../parser'
import { getSigHash, txInteractsWithContract } from '../../parser'
import { WETH_ABI } from './abi/weth'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'weth'
}

export interface ParserArgs {
  chainId: ChainId
  provider: ethers.JsonRpcProvider
}

export class Parser implements SubParser<Tx> {
  provider: ethers.JsonRpcProvider
  readonly chainId: ChainId
  readonly wethContract: string
  readonly abiInterface = new ethers.Interface(WETH_ABI)

  readonly supportedFunctions = {
    depositSigHash: this.abiInterface.getFunction('deposit')!.selector,
    withdrawalSigHash: this.abiInterface.getFunction('withdraw')!.selector,
  }

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.provider = args.provider

    this.wethContract = (() => {
      switch (args.chainId) {
        case 'eip155:1':
          return WETH_TOKEN_CONTRACT_ADDRESS
        case 'eip155:3':
          return WETH_TOKEN_CONTRACT_ADDRESS_ROPSTEN
        default:
          throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)')
      }
    })()
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, this.wethContract)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const assetId = toAssetId({
      ...fromChainId(this.chainId),
      assetNamespace: 'erc20',
      assetReference: this.wethContract,
    })

    const token = {
      contract: this.wethContract,
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH',
    }

    const transfers = (() => {
      switch (txSigHash) {
        case this.supportedFunctions.depositSigHash: {
          return [
            {
              type: TransferType.Receive,
              from: this.wethContract,
              to: tx.from,
              assetId,
              totalValue: tx.value,
              components: [{ value: tx.value }],
              token,
            },
          ]
        }
        case this.supportedFunctions.withdrawalSigHash:
          return [
            {
              type: TransferType.Send,
              from: tx.from,
              to: this.wethContract,
              assetId,
              totalValue: decoded.args.wad.toString(),
              components: [{ value: decoded.args.wad.toString() }],
              token,
            },
          ]
        default:
          return
      }
    })()

    // no supported function detected
    if (!transfers) return

    return await Promise.resolve({
      transfers,
      data: {
        parser: 'weth',
        method: decoded.name,
      },
    })
  }
}
