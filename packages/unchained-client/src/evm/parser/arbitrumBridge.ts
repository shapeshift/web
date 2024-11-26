import type {
  arbitrumChainId,
  type AssetId,
  ChainId,
  ethAssetId,
  ethChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import {
  ARB_OUTBOX_ABI,
  ARB_OUTBOX_CONTRACT,
  ARB_PROXY_ABI,
  ARB_RETRYABLE_TX_CONTRACT,
  ARB_SYS_ABI,
  ARB_SYS_CONTRACT,
  ARBITRUM_L2_ERC20_GATEWAY_PROXY_CONTRACT,
  ARBITRUM_RETRYABLE_TX_ABI,
  L1_ARBITRUM_GATEWAY_ABI,
  L1_ARBITRUM_GATEWAY_CONTRACT,
  L1_ORBIT_CUSTOM_GATEWAY_ABI,
  L1_ORBIT_CUSTOM_GATEWAY_CONTRACT,
  L2_ARBITRUM_CUSTOM_GATEWAY_CONTRACT,
  L2_ARBITRUM_GATEWAY_ABI,
  L2_ARBITRUM_GATEWAY_CONTRACT,
} from '@shapeshiftoss/contracts'
import { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, TxSpecific } from '.'
import { getSigHash, txInteractsWithContract } from '.'
import type { Tx } from './types'

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
  readonly arbOutboxAbi = new ethers.Interface(ARB_OUTBOX_ABI)
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
      if (txInteractsWithContract(tx, ARB_OUTBOX_CONTRACT)) return this.arbOutboxAbi
      if (txInteractsWithContract(tx, ARB_SYS_CONTRACT)) return this.arbSysAbi
      if (txInteractsWithContract(tx, L2_ARBITRUM_GATEWAY_CONTRACT))
        return this.l2ArbitrumGatewayAbi
      if (txInteractsWithContract(tx, L2_ARBITRUM_CUSTOM_GATEWAY_CONTRACT))
        return this.l2ArbitrumGatewayAbi
      if (txInteractsWithContract(tx, ARBITRUM_L2_ERC20_GATEWAY_PROXY_CONTRACT))
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
          case this.l2ArbitrumGatewayAbi.getFunction('finalizeInboundTransfer')!.selector:
            return await Promise.resolve({
              data: {
                ...data,
                // `finalizeInboundTransfer` on the Ethereum side (i.e withdraw request) is internal to the bridge, and only releases fundus safu
                // https://docs.arbitrum.io/build-decentralized-apps/token-bridging/token-bridge-erc20
                // however, on the Arbitrum side, it's an effective deposit
                method:
                  this.chainId === arbitrumChainId ? 'finalizeInboundTransferDeposit' : data.method,
              },
            })
          default:
            return await Promise.resolve({ data })
        }
      default:
        return await Promise.resolve({ data })
    }
  }
}
