import { ChainId } from '@shapeshiftoss/caip'
import { ChainId as YearnChainId, Yearn } from '@yfi/sdk'
import { ethers } from 'ethers'

import { EthereumTx } from '../../generated/ethereum'
import { TxParser } from '../../types'
import { SubParser, TxSpecific } from '../types'
import shapeShiftRouter from './abi/shapeShiftRouter'
import yearnVault from './abi/yearnVault'
import { SHAPE_SHIFT_ROUTER_CONTRACT } from './constants'
import { getSigHash } from './utils'

interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser {
  provider: ethers.providers.JsonRpcProvider
  yearnSdk: Yearn<YearnChainId> | undefined
  yearnTokenVaultAddresses: string[] | undefined

  readonly shapeShiftInterface = new ethers.utils.Interface(shapeShiftRouter)
  readonly yearnInterface = new ethers.utils.Interface(yearnVault)

  readonly supportedYearnFunctions = {
    approveSigHash: this.yearnInterface.getSighash('approve'),
    depositSigHash: this.yearnInterface.getSighash('deposit()'),
    depositAmountSigHash: this.yearnInterface.getSighash('deposit(uint256)'),
    depositAmountAndRecipientSigHash: this.yearnInterface.getSighash('deposit(uint256,address)'),
    withdrawSigHash: this.yearnInterface.getSighash('withdraw(uint256,address)')
  }

  readonly supportedShapeShiftFunctions = {
    depositSigHash: this.shapeShiftInterface.getSighash('deposit(address,address,uint256,uint256)')
  }

  constructor(args: ParserArgs) {
    this.provider = args.provider

    // The only Yearn-supported chain we currently support is mainnet
    if (args.chainId === 'eip155:1') {
      // 1 for EthMain (@yfi/sdk/dist/chain.d.ts)
      this.yearnSdk = new Yearn(1, { provider: this.provider })
    }
  }

  async parse(tx: EthereumTx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    const abiInterface = this.getAbiInterface(txSigHash)
    if (!abiInterface) return

    if (!this.yearnTokenVaultAddresses) {
      const vaults = await this.yearnSdk?.vaults.get()
      this.yearnTokenVaultAddresses = vaults?.map((vault) => vault.address)
    }

    const decoded = abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    switch (txSigHash) {
      case this.supportedYearnFunctions.approveSigHash:
        if (decoded?.args._spender !== SHAPE_SHIFT_ROUTER_CONTRACT) return
        break
      case this.supportedShapeShiftFunctions.depositSigHash:
        if (tx.to !== SHAPE_SHIFT_ROUTER_CONTRACT) return
        break
      case this.supportedYearnFunctions.withdrawSigHash:
      case this.supportedYearnFunctions.depositSigHash:
      case this.supportedYearnFunctions.depositAmountSigHash:
      case this.supportedYearnFunctions.depositAmountAndRecipientSigHash:
        if (tx.to && !this.yearnTokenVaultAddresses?.includes(tx.to)) return
        break
      default:
        return
    }

    return {
      data: {
        method: decoded.name,
        parser: TxParser.Yearn
      }
    }
  }

  getAbiInterface(txSigHash: string | undefined): ethers.utils.Interface | undefined {
    if (Object.values(this.supportedYearnFunctions).some((abi) => abi === txSigHash))
      return this.yearnInterface
    if (Object.values(this.supportedShapeShiftFunctions).some((abi) => abi === txSigHash))
      return this.shapeShiftInterface
    return undefined
  }
}
