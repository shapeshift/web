import { fromAssetId, katanaChainId } from '@shapeshiftoss/caip'
import { katana } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'katanaChainAdapter',
      {
        name: 'katanaChainAdapter',
        featureFlag: ['Katana'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.KatanaMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === katanaChainId && assetNamespace === 'erc20'
                    })
                    .map(asset => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId).assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }))
                }

                return new katana.ChainAdapter({
                  rpcUrl: getConfig().VITE_KATANA_NODE_URL,
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
