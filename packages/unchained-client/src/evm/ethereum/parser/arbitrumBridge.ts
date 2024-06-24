import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../../types'
import { ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT } from '../../arbitrum'
import type { SubParser, Tx, TxSpecific } from '../../parser'
import { txInteractsWithContract } from '../../parser'
import { ARBITRUM_BRIDGE_PROXY_ABI } from './abi/arbitrumBridgeProxy'
import { NATIVE_ARBITRUM_BRIDGE_PROXY_ABI } from './abi/nativeArbitrumBridgeProxy'
import { ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT } from './constants'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'arbitrumBridge'
  assetId?: AssetId
  value?: string
}

export interface ParserArgs {
  chainId: ChainId
}

export class Parser implements SubParser<Tx> {
  readonly chainId: ChainId
  readonly nativeAbiInterface = new ethers.Interface(NATIVE_ARBITRUM_BRIDGE_PROXY_ABI)
  readonly nonNativeAbiInterface = new ethers.Interface(ARBITRUM_BRIDGE_PROXY_ABI)

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (
      !txInteractsWithContract(tx, ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT) &&
      !txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT)
    )
      return

    if (!tx.inputData) return

    let selectedAbi = (() => {
      if (txInteractsWithContract(tx, ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT))
        return this.nativeAbiInterface
      if (txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT))
        return this.nonNativeAbiInterface
    })()

    const decoded = selectedAbi?.parseTransaction({ data: tx.inputData })

    console.log(decoded)
    console.log(tx)

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
