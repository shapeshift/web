import { celoChainId, fromAssetId } from '@shapeshiftoss/caip'
import { celo } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'celoChainAdapter',
      {
        name: 'celoChainAdapter',
        featureFlag: ['Celo'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.CeloMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === celoChainId && assetNamespace === 'erc20'
                    })
                    .map(asset => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId).assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }))
                }

                return new celo.ChainAdapter({
                  rpcUrl: getConfig().VITE_CELO_NODE_URL,
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
