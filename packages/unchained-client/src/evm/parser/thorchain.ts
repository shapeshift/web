import type { ChainId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { Tx } from '../../generated/ethereum'
import { Parser as ThorchainParser } from '../../parser/thorchain'
import type { SubParser, TxSpecific } from '.'
import { getSigHash } from '.'

const routerAbi = [
  'function deposit(address vault, address asset, uint256 amount, string memo)',
  'function depositWithExpiry(address vault, address asset, uint256 amount, string memo, uint256 expiration)',
  'function transferOut(address to, address asset, uint256 amount, string memo)',
  'function transferOutAndCall(address target, address finalAsset, address to, uint256 amountOutMin, string memo)',
  'function swapIn(address tcRouter, address tcVault, string tcMemo, address token, uint256 amount, uint256 amountOutMin, uint256 deadline)',
]

const depositRegex = /^(add|a|\+):([^:]+)(:([^:]+)?)?(:([^:]+)?)?(:([^:]+)?)?$/
const withdrawRegex = /^(withdraw|wd|-):([^:]+)(:([^:]+)?)?(:([^:]+)?)?$/

export interface ParserArgs {
  chainId: ChainId
  midgardUrl: string
  rpcUrl: string
}

interface SupportedFunctions {
  depositSigHash: string
  depositWithExpirySigHash: string
  transferOutSigHash: string
  transferOutAndCallSigHash: string
  swapInSigHash: string
}

export class Parser implements SubParser<Tx> {
  private readonly chainId: ChainId
  private readonly thorchainParser: ThorchainParser
  private readonly abiInterface: ethers.utils.Interface
  private readonly supportedFunctions: SupportedFunctions

  constructor(args: ParserArgs) {
    this.abiInterface = new ethers.utils.Interface(routerAbi)
    this.supportedFunctions = {
      depositSigHash: this.abiInterface.getSighash('deposit'),
      depositWithExpirySigHash: this.abiInterface.getSighash('depositWithExpiry'),
      transferOutSigHash: this.abiInterface.getSighash('transferOut'),
      transferOutAndCallSigHash: this.abiInterface.getSighash('transferOutAndCall'),
      swapInSigHash: this.abiInterface.getSighash('swapIn'),
    }
    this.thorchainParser = new ThorchainParser({ midgardUrl: args.midgardUrl })
    this.chainId = args.chainId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    const memo = (() => {
      // input data is a function call
      if (Object.values(this.supportedFunctions).some(hash => hash === txSigHash)) {
        const decoded = this.abiInterface.parseTransaction({ data: tx.inputData })

        // failed to decode input data
        if (!decoded) return

        return (decoded.args.memo as string) || (decoded.args.tcMemo as string)
      }

      // input data may be a raw thorchain memo
      const maybeMemo = Buffer.from(tx.inputData.slice(2), 'hex').toString()
      if ([depositRegex, withdrawRegex].some(regex => regex.test(maybeMemo.toLowerCase()))) {
        return maybeMemo
      }
    })()

    if (!memo) return

    try {
      return await this.thorchainParser.parse(memo)
    } catch (err) {
      console.error(`failed to parse tx: ${tx.txid} on ${this.chainId}: ${err}`)
    }
  }
}
