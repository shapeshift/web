import type { ChainId } from '@shapeshiftoss/caip'
import { type ChainAdapter, ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'

export function register() {
  return {
    providers: {
      chainAdapters: {
        [KnownChainIds.EthereumMainnet]: () => {
          const http = new unchained.ethereum.V1Api(
            new unchained.ethereum.Configuration({
              basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
            }),
          )

          const ws = new unchained.ws.Client<unchained.ethereum.EthereumTx>(
            getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
          )

          return new ethereum.ChainAdapter({
            providers: { http, ws },
            rpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
          }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
          //TODO: When addressing the above, uncomment the matching test in ./index.test.tsx
        },
      },
    },
  } as const
}
