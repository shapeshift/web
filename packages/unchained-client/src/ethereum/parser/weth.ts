import { ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import { EthereumTx } from '../../generated/ethereum'
import { TransferType, TxParser } from '../../types'
import { SubParser, TxSpecific } from '../types'
import WETH_ABI from './abi/weth'
import { WETH_CONTRACT_MAINNET, WETH_CONTRACT_ROPSTEN } from './constants'
import { getSigHash, txInteractsWithContract } from './utils'

export interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser {
  provider: ethers.providers.JsonRpcProvider

  readonly chainId: ChainId
  readonly wethContract: string
  readonly abiInterface = new ethers.utils.Interface(WETH_ABI)

  readonly supportedFunctions = {
    depositSigHash: this.abiInterface.getSighash('deposit'),
    withdrawalSigHash: this.abiInterface.getSighash('withdraw')
  }

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.provider = args.provider

    switch (args.chainId) {
      case 'eip155:1':
        this.wethContract = WETH_CONTRACT_MAINNET
        break
      case 'eip155:3':
        this.wethContract = WETH_CONTRACT_ROPSTEN
        break
      default:
        throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)')
    }
  }

  async parse(tx: EthereumTx): Promise<TxSpecific | undefined> {
    if (!txInteractsWithContract(tx, this.wethContract)) return
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const assetId = toAssetId({
      ...fromChainId(this.chainId),
      assetNamespace: 'erc20',
      assetReference: this.wethContract
    })

    const token = {
      contract: this.wethContract,
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH'
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
              token
            }
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
              token
            }
          ]
        default:
          return
      }
    })()

    // no supported function detected
    if (!transfers) return

    return {
      transfers,
      data: {
        parser: TxParser.WETH,
        method: decoded.name
      }
    }
  }
}
