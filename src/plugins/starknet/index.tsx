import { fromAssetId, starknetChainId } from '@shapeshiftoss/caip'
import { starknet } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'starknetChainAdapter',
      {
        name: 'starknetChainAdapter',
        featureFlag: ['Starknet'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.StarknetMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService()
                  return assetService.assets
                    .filter(asset => {
                      const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                      return chainId === starknetChainId && assetNamespace === 'token'
                    })
                    .map(asset => {
                      const assetReference = fromAssetId(asset.assetId).assetReference
                      // Normalize contract addresses to ensure consistent padding
                      const normalizedAddress = assetReference.startsWith('0x')
                        ? '0x' + assetReference.slice(2).padStart(64, '0')
                        : '0x' + assetReference.padStart(64, '0')
                      return {
                        assetId: asset.assetId,
                        contractAddress: normalizedAddress,
                        symbol: asset.symbol,
                        name: asset.name,
                        precision: asset.precision,
                      }
                    })
                }

                return new starknet.ChainAdapter({
                  rpcUrl: getConfig().VITE_STARKNET_NODE_URL,
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
