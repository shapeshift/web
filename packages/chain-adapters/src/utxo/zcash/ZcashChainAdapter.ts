import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, zecAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { BroadcastTransactionInput } from '../../types'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../UtxoBaseAdapter'
import { UtxoBaseAdapter } from '../UtxoBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ZcashMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ZcashMainnet
const SUPPORTED_ACCOUNT_TYPES = [UtxoAccountType.P2pkh]

export interface ChainAdapterArgs extends BaseChainAdapterArgs {
  mayaMidgardUrl: string
}

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.ZcashMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Zcash),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: zecAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      parser: new unchained.zcash.TransactionParser({
        assetId: zecAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.mayaMidgardUrl,
      }),
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Zcash
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Zcash)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.ZcashMainnet {
    return KnownChainIds.ZcashMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async broadcastTransaction({ hex }: Pick<BroadcastTransactionInput, 'hex'>): Promise<string> {
    console.log('[Zcash Adapter] Broadcasting via Blockchair monkey-patch:', {
      hexLength: hex.length,
      hexSample: hex.substring(0, 64),
    })

    try {
      const response = await fetch('https://api.blockchair.com/zcash/push/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: hex }),
      })

      const result = await response.json()
      console.log('[Zcash Adapter] Blockchair response:', result)

      if (result.context.code !== 200) {
        const errorMsg = result.context.error || 'Transaction broadcast failed'
        console.error('[Zcash Adapter] Blockchair error:', errorMsg)
        throw new Error(errorMsg)
      }

      const txHash = result.data?.transaction_hash
      console.log('[Zcash Adapter] Broadcast successful, txHash:', txHash)
      return txHash || ''
    } catch (err) {
      console.error('[Zcash Adapter] Blockchair broadcast failed:', err)
      throw err
    }
  }
}
