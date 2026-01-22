import type { EvmGenericChainConfig } from '@shapeshiftoss/caip'
import { fromAssetId, GENERIC_EVM_CHAINS } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { generic } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import * as viemChains from 'viem/chains'

import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

const createGetKnownTokens = (config: EvmGenericChainConfig) => () => {
  const assetService = getAssetService()
  return assetService.assets
    .filter(asset => {
      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
      return chainId === config.chainId && assetNamespace === 'erc20'
    })
    .map(asset => ({
      assetId: asset.assetId,
      contractAddress: fromAssetId(asset.assetId).assetReference,
      symbol: asset.symbol,
      name: asset.name,
      precision: asset.precision,
    }))
}

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return GENERIC_EVM_CHAINS.map(config => {
    const pluginId = `${config.name}ChainAdapter`
    const numericChainId = config.chainId.split(':')[1]
    const rpcUrlEnvKey = `VITE_GENERIC_CHAIN_${numericChainId}_NODE_URL`

    return [
      pluginId,
      {
        name: pluginId,
        featureFlag: ['GenericEvmChains'],
        providers: {
          chainAdapters: [
            [
              config.chainId,
              () => {
                let rpcUrl = config.rpcUrl || import.meta.env[rpcUrlEnvKey]

                if (!rpcUrl && config.viemChainKey) {
                  const viemChain = viemChains[config.viemChainKey]
                  if (viemChain?.rpcUrls?.default?.http?.[0]) {
                    rpcUrl = viemChain.rpcUrls.default.http[0]
                  }
                }

                if (!rpcUrl) {
                  throw new Error(
                    `Missing RPC URL for generic chain ${config.name} (${config.chainId}). Please set ${rpcUrlEnvKey} in your .env file.`,
                  )
                }

                return new generic.GenericEvmChainAdapter({
                  config: { ...config, rpcUrl },
                  rpcUrl,
                  getKnownTokens: createGetKnownTokens(config),
                }) as unknown as ChainAdapter<KnownChainIds>
              },
            ],
          ],
        },
      },
    ]
  })
}
