import { ChainId, toAssetId } from '@shapeshiftoss/caip'
import { ChainId as YearnChainId, Yearn } from '@yfi/sdk'
import { BigNumber, ethers } from 'ethers'

import { Tx } from '../../../generated/ethereum'
import { BaseTxMetadata } from '../../../types'
import { getSigHash, SubParser, TxSpecific } from '../../parser'
import shapeShiftRouter from './abi/shapeShiftRouter'
import yearnVault from './abi/yearnVault'
import { SHAPE_SHIFT_ROUTER_CONTRACT } from './constants'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'yearn'
  assetId?: string
  value?: string
}

interface ParserArgs {
  chainId: ChainId
  provider: ethers.providers.JsonRpcProvider
}

export class Parser implements SubParser<Tx> {
  provider: ethers.providers.JsonRpcProvider
  yearnSdk: Yearn<YearnChainId> | undefined
  yearnTokenVaultAddresses: string[] | undefined

  readonly chainId: ChainId

  readonly shapeShiftInterface = new ethers.utils.Interface(shapeShiftRouter)
  readonly yearnInterface = new ethers.utils.Interface(yearnVault)

  readonly supportedYearnFunctions = {
    approveSigHash: this.yearnInterface.getSighash('approve'),
    depositSigHash: this.yearnInterface.getSighash('deposit()'),
    depositAmountSigHash: this.yearnInterface.getSighash('deposit(uint256)'),
    depositAmountAndRecipientSigHash: this.yearnInterface.getSighash('deposit(uint256,address)'),
    withdrawSigHash: this.yearnInterface.getSighash('withdraw(uint256,address)'),
  }

  readonly supportedShapeShiftFunctions = {
    depositSigHash: this.shapeShiftInterface.getSighash('deposit(address,address,uint256,uint256)'),
  }

  constructor(args: ParserArgs) {
    this.provider = args.provider
    this.chainId = args.chainId

    // The only Yearn-supported chain we currently support is mainnet
    if (args.chainId === 'eip155:1') {
      // 1 for EthMain (@yfi/sdk/dist/chain.d.ts)
      this.yearnSdk = new Yearn(1, { provider: this.provider })
    }
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    const supportedSigHashes = [
      ...Object.values(this.supportedShapeShiftFunctions),
      ...Object.values(this.supportedYearnFunctions),
    ]

    if (!supportedSigHashes.some((hash) => hash === txSigHash)) return

    const abiInterface = this.getAbiInterface(txSigHash)
    if (!abiInterface) return

    if (!this.yearnTokenVaultAddresses) {
      try {
        const vaults = await this.yearnSdk?.vaults.get()
        this.yearnTokenVaultAddresses = vaults?.map((vault) => vault.address)
      } catch (e) {
        console.error('yearn tx parser unable to fetch vaults', e)
        return
      }
    }

    const decoded = abiInterface.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const data: TxMetadata = {
      method: decoded.name,
      parser: 'yearn',
    }

    switch (txSigHash) {
      case this.supportedYearnFunctions.approveSigHash: {
        if (decoded.args._spender !== SHAPE_SHIFT_ROUTER_CONTRACT) return

        const value = decoded.args._value as BigNumber
        const assetId = toAssetId({
          chainId: this.chainId,
          assetNamespace: 'erc20',
          assetReference: tx.to,
        })

        if (value.isZero()) {
          return { data: { ...data, assetId, method: 'revoke', value: value.toString() } }
        }

        return { data: { ...data, assetId, value: value.toString() } }
      }
      case this.supportedShapeShiftFunctions.depositSigHash:
        if (tx.to !== SHAPE_SHIFT_ROUTER_CONTRACT) return
        return { data }
      case this.supportedYearnFunctions.depositAmountAndRecipientSigHash:
        if (tx.to && !this.yearnTokenVaultAddresses?.includes(tx.to)) return
        return { data }
      case this.supportedYearnFunctions.withdrawSigHash:
      case this.supportedYearnFunctions.depositSigHash:
      case this.supportedYearnFunctions.depositAmountSigHash:
      default:
        return { data }
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
