import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, registerEvmChainReference, toAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { createDynamicEvmAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'

import {
  getAllRelaySupportedChainConfigs,
  RELAY_SUPPORTED_CHAIN_IDS,
} from '@/lib/evmChains/evmChainRegistry'
import type { EvmChainConfig } from '@/lib/evmChains/types'
import type { Plugins } from '@/plugins/types'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { store } from '@/state/store'

const FIRST_CLASS_EVM_CHAIN_IDS = new Set([
  1, 10, 56, 100, 137, 143, 999, 1329, 8453, 9745, 42161, 42170, 42220, 43114, 747474,
])

const getDynamicEvmChainIds = (): number[] => {
  return RELAY_SUPPORTED_CHAIN_IDS.filter(chainId => !FIRST_CLASS_EVM_CHAIN_IDS.has(chainId))
}

const createNativeAsset = (config: EvmChainConfig): Asset => {
  registerEvmChainReference(String(config.chainId))

  const caipChainId = `eip155:${config.chainId}` as ChainId
  const nativeAssetId = toAssetId({
    chainId: caipChainId,
    assetNamespace: ASSET_NAMESPACE.slip44,
    assetReference: '60',
  })

  const explorerUrl = config.blockExplorerUrl ?? ''

  return {
    assetId: nativeAssetId,
    chainId: caipChainId,
    symbol: config.nativeCurrency.symbol,
    name: config.nativeCurrency.name,
    precision: config.nativeCurrency.decimals,
    color: '#627EEA',
    icon: config.iconUrl,
    explorer: explorerUrl,
    explorerTxLink: explorerUrl ? `${explorerUrl}/tx/` : '',
    explorerAddressLink: explorerUrl ? `${explorerUrl}/address/` : '',
    relatedAssetKey: null,
    isPrimary: true,
  }
}

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  const dynamicChainIds = getDynamicEvmChainIds()
  const chainConfigs = getAllRelaySupportedChainConfigs()

  const chainAdapters: [ChainId, () => ChainAdapter<KnownChainIds>][] = []
  const nativeAssets: Asset[] = []

  for (const chainId of dynamicChainIds) {
    const config = chainConfigs.get(chainId)
    if (!config) continue

    if (!config.rpcUrls.length) {
      console.warn(`[dynamicEvmChains] No RPC URL for chain ${chainId} (${config.name}), skipping`)
      continue
    }

    try {
      const caipChainId = `eip155:${chainId}` as ChainId

      chainAdapters.push([
        caipChainId,
        () =>
          createDynamicEvmAdapter({
            config: {
              chainId: config.chainId,
              name: config.name,
              displayName: config.displayName,
              nativeCurrency: config.nativeCurrency,
              rpcUrl: config.rpcUrls[0],
              blockExplorerUrl: config.blockExplorerUrl,
            },
          }) as unknown as ChainAdapter<KnownChainIds>,
      ])

      nativeAssets.push(createNativeAsset(config))
    } catch (e) {
      console.warn(`[dynamicEvmChains] Failed to register chain ${chainId}:`, e)
    }
  }

  const onLoad = () => {
    for (const asset of nativeAssets) {
      store.dispatch(assets.actions.upsertAsset(asset))
    }
  }

  return [
    [
      'dynamicEvmChains',
      {
        name: 'dynamicEvmChains',
        featureFlag: ['DynamicEvmChains'],
        onLoad,
        providers: {
          chainAdapters,
        },
      },
    ],
  ]
}

export const getDynamicEvmChainCount = (): number => {
  return getDynamicEvmChainIds().length
}

export const isDynamicEvmChain = (chainId: number): boolean => {
  return (
    !FIRST_CLASS_EVM_CHAIN_IDS.has(chainId) &&
    (RELAY_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId)
  )
}
