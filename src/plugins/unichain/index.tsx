import { fromAssetId, unichainChainId } from '@shapeshiftoss/caip'
import { unichain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'unichainChainAdapter',
      {
        name: 'unichainChainAdapter',
        featureFlag: ['Unichain'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.UnichainMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === unichainChainId && assetNamespace === 'erc20'
                    })
                    .map(asset => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId).assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }))
                }

                return new unichain.ChainAdapter({
                  rpcUrl: getConfig().VITE_UNICHAIN_NODE_URL,
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
