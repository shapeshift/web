import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'
import { ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import { EthereumTxParser, SubParser, TxMethod, TxSpecific } from '../types'
import erc20 from './abi/erc20'
import { getSigHash } from './utils'

interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser {
  provider: ethers.providers.JsonRpcProvider

  readonly chainId: ChainId
  readonly erc20Interface = new ethers.utils.Interface(erc20)

  readonly supportedERC20Functions = {
    approveSigHash: this.erc20Interface.getSighash('approve')
  }

  constructor(args: ParserArgs) {
    this.provider = args.provider
    this.chainId = args.chainId
  }

  async parse(tx: BlockbookTx): Promise<TxSpecific | undefined> {
    const txData = tx.ethereumSpecific?.data

    if (!txData) return

    const txSigHash = getSigHash(txData)

    const abiInterface = this.getAbiInterface(txSigHash)
    if (!abiInterface) return

    const decoded = abiInterface.parseTransaction({ data: txData })

    // failed to decode input data
    if (!decoded) return

    const receiveAddress = tx.vout?.[0].addresses?.[0] ?? ''

    return {
      data: {
        assetId: receiveAddress
          ? toAssetId({
              ...fromChainId(this.chainId),
              assetNamespace: 'erc20',
              assetReference: receiveAddress
            })
          : undefined,
        method: TxMethod.Approve,
        parser: EthereumTxParser.ERC20Approve
      }
    }
  }

  getAbiInterface(txSigHash: string | undefined): ethers.utils.Interface | undefined {
    if (Object.values(this.supportedERC20Functions).some((abi) => abi === txSigHash))
      return this.erc20Interface
    return undefined
  }
}
