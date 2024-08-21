import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  type AssetId,
  ethAssetId,
  ethChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, TxSpecific } from '.'
import { getSigHash, txInteractsWithContract } from '.'
import { ARB_PROXY_ABI } from './abi/ArbProxy'
import { ARBITRUM_RETRYABLE_TX_ABI } from './abi/ArbRetryableTx'
import { ARB_SYS_ABI } from './abi/ArbSys'
import { L1_ARBITRUM_GATEWAY_ABI } from './abi/L1ArbitrumGateway'
import { L1_ORBIT_CUSTOM_GATEWAY_ABI } from './abi/L1OrbitCustomGateway'
import { L2_ARBITRUM_GATEWAY_ABI } from './abi/L2ArbitrumGateway'
import type { Tx } from './types'

const ARB_SYS_CONTRACT = '0x0000000000000000000000000000000000000064'
const ARBITRUM_L2_ERC20_GATEWAY_PROXY = '0x09e9222E96E7B4AE2a407B98d48e330053351EEe'
const ARB_RETRYABLE_TX_CONTRACT = '0x000000000000000000000000000000000000006e'
const L2_ARBITRUM_CUSTOM_GATEWAY_CONTRACT = '0x096760F208390250649E3e8763348E783AEF5562'
const L2_ARBITRUM_GATEWAY_CONTRACT = '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933'
const L1_ARBITRUM_GATEWAY_CONTRACT = '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef'
const L1_ORBIT_CUSTOM_GATEWAY_CONTRACT = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'arbitrumBridge'
  assetId?: AssetId
  destinationAddress?: string
  destinationAssetId?: AssetId
  value?: string
}

export interface ParserArgs {
  chainId: ChainId
}

export class Parser implements SubParser<Tx> {
  readonly chainId: ChainId

  readonly arbProxyAbi = new ethers.Interface(ARB_PROXY_ABI)
  readonly arbSysAbi = new ethers.Interface(ARB_SYS_ABI)
  readonly arbRetryableTxAbi = new ethers.Interface(ARBITRUM_RETRYABLE_TX_ABI)
  readonly l2ArbitrumGatewayAbi = new ethers.Interface(L2_ARBITRUM_GATEWAY_ABI)
  readonly l1OrbitCustomGatewayAbi = new ethers.Interface(L1_ORBIT_CUSTOM_GATEWAY_ABI)
  readonly l1ArbitrumGatewayAbi = new ethers.Interface(L1_ARBITRUM_GATEWAY_ABI)

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.inputData) return

    const txSigHash = getSigHash(tx.inputData)

    const selectedAbi = (() => {
      if (txInteractsWithContract(tx, ARB_SYS_CONTRACT)) return this.arbSysAbi
      if (txInteractsWithContract(tx, L2_ARBITRUM_GATEWAY_CONTRACT))
        return this.l2ArbitrumGatewayAbi
      if (txInteractsWithContract(tx, L2_ARBITRUM_CUSTOM_GATEWAY_CONTRACT))
        return this.l2ArbitrumGatewayAbi
      if (txInteractsWithContract(tx, ARBITRUM_L2_ERC20_GATEWAY_PROXY))
        return this.l2ArbitrumGatewayAbi
      if (
        txInteractsWithContract(tx, L1_ARBITRUM_GATEWAY_CONTRACT) &&
        this.chainId === arbitrumChainId
      )
        return this.arbProxyAbi
      if (txInteractsWithContract(tx, ARB_RETRYABLE_TX_CONTRACT)) return this.arbRetryableTxAbi
      if (txInteractsWithContract(tx, L1_ORBIT_CUSTOM_GATEWAY_CONTRACT))
        return this.l1OrbitCustomGatewayAbi
      if (txInteractsWithContract(tx, L1_ARBITRUM_GATEWAY_CONTRACT))
        return this.l1ArbitrumGatewayAbi
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

    // On ethereum side, we wants to tag it as a deposit if it interacts with the L1 Arbitrum Gateway
    if (txInteractsWithContract(tx, L1_ARBITRUM_GATEWAY_CONTRACT) && this.chainId === ethChainId) {
      data.method = `${decoded.name}Deposit`
    }

    switch (selectedAbi) {
      case this.arbSysAbi:
        switch (txSigHash) {
          case this.arbSysAbi.getFunction('withdrawEth')!.selector:
            return await Promise.resolve({
              data: {
                ...data,
                destinationAddress: decoded.args.destination as string,
                destinationAssetId: ethAssetId,
                value: tx.value,
              },
            })
          default:
            return await Promise.resolve({ data })
        }
      case this.l2ArbitrumGatewayAbi:
        switch (txSigHash) {
          case this.l2ArbitrumGatewayAbi.getFunction(
            'outboundTransfer(address,address,uint256,bytes)',
          )!.selector: {
            const amount = decoded.args._amount as BigInt
            const l1Token = decoded.args._l1Token as string

            const destinationAssetId = toAssetId({
              chainId: ethChainId,
              assetNamespace: 'erc20',
              assetReference: l1Token,
            })

            return await Promise.resolve({
              data: {
                ...data,
                destinationAddress: decoded.args._to as string,
                destinationAssetId,
                value: amount.toString(),
              },
            })
          }
          default:
            return await Promise.resolve({ data })
        }
      default:
        return await Promise.resolve({ data })
    }
  }
}
