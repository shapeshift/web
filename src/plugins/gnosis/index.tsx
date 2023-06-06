import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { gnosis } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.gnosis.V1Api(
  new unchained.gnosis.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_GNOSIS_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'gnosisChainAdapter',
      {
        name: 'gnosisChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.GnosisMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.gnosis.Tx>(
                  getConfig().REACT_APP_UNCHAINED_GNOSIS_WS_URL,
                )

                return new gnosis.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_GNOSIS_NODE_URL,
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
