import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, bscAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { handleBroadcastTransactionError } from '../../error/ErrorHandler'
import type { BroadcastTransactionInput } from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const BSC_PUBLIC_RPC_ENDPOINTS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.ninicoin.io/',
  'https://bsc-rpc.publicnode.com',
]

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BnbSmartChainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BnbSmartChainMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.bnbsmartchain.V1Api> {
  midgardUrl: string
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: bscAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: new unchained.bnbsmartchain.TransactionParser({
        assetId: bscAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
        midgardUrl: args.midgardUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.BnbSmartChain
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.BnbSmartChain,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.BnbSmartChainMainnet {
    return KnownChainIds.BnbSmartChainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  /**
   * Override broadcastTransaction to add fallback to public BSC RPC endpoints.
   * When the unchained API broadcast fails, we retry via public BSC JSON-RPC
   * endpoints using eth_sendRawTransaction.
   */
  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      // Sanctions check inside try-catch to match base class error handling pattern
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const txHash = await this.providers.http.sendTx({ sendTxBody: { hex } })
      return txHash
    } catch (unchainedErr) {
      // Don't fall back to public RPCs for sanctions failures
      if (
        unchainedErr instanceof Error &&
        unchainedErr.message.toLowerCase().includes('sanctioned')
      ) {
        return handleBroadcastTransactionError(unchainedErr)
      }

      console.warn(
        '[BSC] Unchained broadcast failed, falling back to public RPC endpoints',
        unchainedErr,
      )

      // Fallback: try public BSC RPC endpoints
      const rawTxHex = hex.startsWith('0x') ? hex : `0x${hex}`

      for (const rpcUrl of BSC_PUBLIC_RPC_ENDPOINTS) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10_000)
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransaction',
              params: [rawTxHex],
              id: 1,
            }),
          })

          const data = await response.json()

          if (data.result) {
            console.info(`[BSC] Broadcast succeeded via fallback RPC: ${rpcUrl}`)
            return data.result as string
          }

          if (data.error) {
            console.warn(`[BSC] Fallback RPC ${rpcUrl} returned error:`, data.error)
          }
        } catch (rpcErr) {
          console.warn(`[BSC] Fallback RPC ${rpcUrl} failed:`, rpcErr)
        } finally {
          clearTimeout(timeoutId)
        }
      }

      // All fallbacks failed — throw the original unchained error
      return handleBroadcastTransactionError(unchainedErr)
    }
  }
}
