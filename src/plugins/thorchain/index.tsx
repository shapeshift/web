import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { thorchain } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'thorchainChainAdapter',
      {
        name: 'thorchainChainAdapter',
        featureFlag: 'Thorchain',
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
