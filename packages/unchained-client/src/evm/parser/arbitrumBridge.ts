import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import {
  ARBITRUM_RETRYABLE_CONTRACT,
  ARBITRUM_SYS_CONTRACT,
  ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT,
} from '../arbitrum'
import type { SubParser, TxSpecific } from '.'
import { txInteractsWithContract } from '.'
import { ARBITRUM_BRIDGE_ABI } from './abi/arbitrumBridge'
import { ARBITRUM_NATIVE_BRIDGE_ABI } from './abi/arbitrumNativeBridge'
import { ARBITRUM_RETRYABLE_ABI } from './abi/arbitrumRetryable'
import { ETHEREUM_TO_ARBITRUM_PROXY_ABI } from './abi/ethereumToArbitrumProxy'
import type { Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'arbitrumBridge'
  assetId?: AssetId
  value?: string
}

export interface ParserArgs {
  chainId: ChainId
  proxyContract: string
}

export class Parser implements SubParser<Tx> {
  readonly chainId: ChainId
  private readonly proxyContract
  readonly abiInterface = new ethers.Interface(ARBITRUM_BRIDGE_ABI)
  readonly nativeAbiInterface = new ethers.Interface(ARBITRUM_NATIVE_BRIDGE_ABI)
  readonly ethereumToArbitrumAbiInterface = new ethers.Interface(ETHEREUM_TO_ARBITRUM_PROXY_ABI)
  readonly retryableAbiInterface = new ethers.Interface(ARBITRUM_RETRYABLE_ABI)

  constructor(args: ParserArgs) {
    this.proxyContract = args.proxyContract
    this.chainId = args.chainId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (
      !txInteractsWithContract(tx, this.proxyContract) &&
      !txInteractsWithContract(tx, ARBITRUM_SYS_CONTRACT) &&
      !txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT) &&
      !txInteractsWithContract(tx, ARBITRUM_RETRYABLE_CONTRACT)
    )
      return

    if (!tx.inputData) return

    let selectedAbi = (() => {
      if (txInteractsWithContract(tx, ARBITRUM_SYS_CONTRACT)) return this.nativeAbiInterface
      if (txInteractsWithContract(tx, this.proxyContract)) return this.abiInterface
      if (txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT))
        return this.ethereumToArbitrumAbiInterface
      if (txInteractsWithContract(tx, ARBITRUM_RETRYABLE_CONTRACT))
        return this.retryableAbiInterface
    })()

    const decoded = selectedAbi?.parseTransaction({ data: tx.inputData })

    // failed to decode input data
    if (!decoded) return

    const maybeAssetId = tx.tokenTransfers?.[0].contract
      ? toAssetId({
          chainId: this.chainId,
          assetNamespace: 'erc20',
          assetReference: tx.tokenTransfers?.[0].contract,
        })
      : undefined

    const data: TxMetadata = {
      assetId: maybeAssetId,
      method: decoded.name,
      parser: 'arbitrumBridge',
    }

    return await Promise.resolve({ data })
  }
}
