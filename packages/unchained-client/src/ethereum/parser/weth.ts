import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import { ethers } from 'ethers'

import { TransferType, TxParser } from '../../types'
import { Network, SubParser, TxSpecific } from '../types'
import ERC20_ABI from './abi/erc20'
import WETH_ABI from './abi/weth'
import { WETH_CONTRACT_MAINNET, WETH_CONTRACT_ROPSTEN } from './constants'
import { getSigHash, toNetworkType, txInteractsWithContract } from './utils'

export interface ParserArgs {
  network: Network
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser {
  provider: ethers.providers.JsonRpcProvider

  readonly network: Network
  readonly wethContract: string
  readonly abiInterface = new ethers.utils.Interface(WETH_ABI)

  readonly supportedFunctions = {
    depositSigHash: this.abiInterface.getSighash('deposit'),
    withdrawalSigHash: this.abiInterface.getSighash('withdraw')
  }

  constructor(args: ParserArgs) {
    this.network = args.network
    this.provider = args.provider

    this.wethContract = {
      mainnet: WETH_CONTRACT_MAINNET,
      ropsten: WETH_CONTRACT_ROPSTEN
    }[this.network]
  }

  async parse(tx: BlockbookTx): Promise<TxSpecific | undefined> {
    const txData = tx.ethereumSpecific?.data

    if (!txInteractsWithContract(tx, this.wethContract)) return
    if (!txData) return

    const txSigHash = getSigHash(txData)

    if (!Object.values(this.supportedFunctions).some((hash) => hash === txSigHash)) return

    const decoded = this.abiInterface.parseTransaction({ data: txData })

    // failed to decode input data
    if (!decoded) return

    const sendAddress = tx.vin[0].addresses?.[0] ?? ''
    const contract = new ethers.Contract(this.wethContract, ERC20_ABI, this.provider)

    const assetId = caip19.toCAIP19({
      chain: ChainTypes.Ethereum,
      network: toNetworkType(this.network),
      assetNamespace: AssetNamespace.ERC20,
      assetReference: this.wethContract
    })

    const token = {
      contract: this.wethContract,
      decimals: await contract.decimals(),
      name: await contract.name(),
      symbol: await contract.symbol()
    }

    const transfers = (() => {
      switch (txSigHash) {
        case this.supportedFunctions.depositSigHash: {
          return [
            {
              type: TransferType.Receive,
              from: this.wethContract,
              to: sendAddress,
              caip19: assetId,
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
              from: sendAddress,
              to: this.wethContract,
              caip19: assetId,
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
