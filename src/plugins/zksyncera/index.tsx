import { fromAssetId, zkSyncEraChainId } from '@shapeshiftoss/caip'
import { zksyncera } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'zkSyncEraChainAdapter',
      {
        name: 'zkSyncEraChainAdapter',
        featureFlag: ['ZkSyncEra'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ZkSyncEraMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === zkSyncEraChainId && assetNamespace === 'erc20'
                    })
                    .map(asset => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId).assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }))
                }

                return new zksyncera.ChainAdapter({
                  rpcUrl: getConfig().VITE_ZKSYNC_ERA_NODE_URL,
                  getKnownTokens,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
