import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { thorchain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'thorchainChainAdapter',
      {
        name: 'thorchainChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ThorchainMainnet,
              () => {
                const http = new unchained.thorchain.V1Api(
                  new unchained.thorchain.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.cosmossdk.Tx>(
                  getConfig().REACT_APP_UNCHAINED_THORCHAIN_WS_URL,
                )

                return new thorchain.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Thorchain',
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
