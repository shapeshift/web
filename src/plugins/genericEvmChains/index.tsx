import { fromAssetId, GENERIC_EVM_CHAINS } from '@shapeshiftoss/caip'
import type { EvmGenericChainConfig } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { generic } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

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
                if (!config.rpcUrl) {
                  throw new Error(
                    `Missing RPC URL for generic chain ${config.name} (${config.chainId})`,
                  )
                }

                return new generic.GenericEvmChainAdapter({
                  config,
                  rpcUrl: config.rpcUrl,
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
