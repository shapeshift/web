import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, ethAssetId } from '@shapeshiftoss/caip'
import type { DefaultBIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { ValidAddressResult } from '../../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../../types'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.EthereumMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.EthereumMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.ethereum.V1Api> {
  midgardUrl: string
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  static readonly defaultBIP44Params: DefaultBIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereum),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: ethAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.ethereum.TransactionParser({
        assetId: ethAssetId,
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
    return ChainAdapterDisplayName.Ethereum
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Ethereum,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  validateEnsAddress(address: string): ValidAddressResult {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
