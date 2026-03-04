import { fromAssetId, plasmaChainId } from '@shapeshiftoss/caip'
import { plasma } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'plasmaChainAdapter',
      {
        name: 'plasmaChainAdapter',
        featureFlag: ['Plasma'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.PlasmaMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === plasmaChainId && assetNamespace === 'erc20'
                    })
                    .map(asset => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId).assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }))
                }

                return new plasma.ChainAdapter({
                  rpcUrl: getConfig().VITE_PLASMA_NODE_URL,
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
