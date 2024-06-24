import type { ChainId } from '@shapeshiftoss/caip'
import { arbitrumChainId, type AssetId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import { ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT } from '../ethereum/parser/constants'
import type { SubParser, TxSpecific } from '.'
import { txInteractsWithContract } from '.'
import { ARBITRUM_BRIDGE_ABI } from './abi/arbitrumBridge'
import { ARBITRUM_NATIVE_BRIDGE_ABI } from './abi/arbitrumNativeBridge'
import { ARBITRUM_RETRYABLE_ABI } from './abi/arbitrumRetryable'
import { ETHEREUM_TO_ARBITRUM_PROXY_ABI } from './abi/ethereumToArbitrumProxy'
import { L1_ERC20_ARBITRUM_BRIDGE_PROXY_ABI } from './abi/l1Erc20ArbitrumBridgeProxy'
import { L1_NATIVE_ARBITRUM_BRIDGE_PROXY_ABI } from './abi/l1NativeArbitrumBridgeProxy'
import type { Tx } from './types'

export const ARBITRUM_BRIDGE_PROXY_CONTRACT = '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933'
export const ARBITRUM_SYS_CONTRACT = '0x0000000000000000000000000000000000000064'
export const ARBITRUM_RETRYABLE_CONTRACT = '0x000000000000000000000000000000000000006e'
export const ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT = '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef'
export const ARBITRUM_L2_CUSTOM_GATEWAY_PROXY = '0x096760F208390250649E3e8763348E783AEF5562'
export const ARBITRUM_L2_ERC20_GATEWAY_PROXY = '0x09e9222E96E7B4AE2a407B98d48e330053351EEe'

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
  readonly abiInterface = new ethers.Interface(ARBITRUM_BRIDGE_ABI)
  readonly nativeAbiInterface = new ethers.Interface(ARBITRUM_NATIVE_BRIDGE_ABI)
  readonly ethereumToArbitrumAbiInterface = new ethers.Interface(ETHEREUM_TO_ARBITRUM_PROXY_ABI)
  readonly retryableAbiInterface = new ethers.Interface(ARBITRUM_RETRYABLE_ABI)

  readonly l1NativeAbiInterface = new ethers.Interface(L1_NATIVE_ARBITRUM_BRIDGE_PROXY_ABI)
  readonly l1NonNativeAbiInterface = new ethers.Interface(L1_ERC20_ARBITRUM_BRIDGE_PROXY_ABI)

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    console.log(tx)
    if (
      !txInteractsWithContract(tx, ARBITRUM_BRIDGE_PROXY_CONTRACT) &&
      !txInteractsWithContract(tx, ARBITRUM_SYS_CONTRACT) &&
      !txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT) &&
      !txInteractsWithContract(tx, ARBITRUM_RETRYABLE_CONTRACT) &&
      !txInteractsWithContract(tx, ARBITRUM_L2_CUSTOM_GATEWAY_PROXY) &&
      !txInteractsWithContract(tx, ARBITRUM_L2_ERC20_GATEWAY_PROXY) &&
      !txInteractsWithContract(tx, ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT)
    )
      return

    if (!tx.inputData) return

    let selectedAbi = (() => {
      if (txInteractsWithContract(tx, ARBITRUM_SYS_CONTRACT)) return this.nativeAbiInterface
      if (txInteractsWithContract(tx, ARBITRUM_BRIDGE_PROXY_CONTRACT)) return this.abiInterface
      if (txInteractsWithContract(tx, ARBITRUM_L2_CUSTOM_GATEWAY_PROXY)) return this.abiInterface
      if (txInteractsWithContract(tx, ARBITRUM_L2_ERC20_GATEWAY_PROXY)) return this.abiInterface
      if (
        txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT) &&
        this.chainId === arbitrumChainId
      )
        return this.ethereumToArbitrumAbiInterface
      if (txInteractsWithContract(tx, ARBITRUM_RETRYABLE_CONTRACT))
        return this.retryableAbiInterface
      if (txInteractsWithContract(tx, ETHEREUM_ARB_BRIDGE_PROXY_CONTRACT))
        return this.l1NativeAbiInterface
      if (txInteractsWithContract(tx, ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT))
        return this.l1NonNativeAbiInterface
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
