import { starknetChainId } from '@shapeshiftoss/caip'
import { starknet } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
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
                // Normalize contract addresses to ensure consistent padding
                const getKnownTokens = createGetKnownTokens(
                  starknetChainId,
                  'token',
                  assetReference =>
                    assetReference.startsWith('0x')
                      ? '0x' + assetReference.slice(2).padStart(64, '0')
                      : '0x' + assetReference.padStart(64, '0'),
                )

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
