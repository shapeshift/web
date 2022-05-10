import { ChainAdapter as EthereumChainAdapter } from '@shapeshiftoss/chain-adapters/dist/ethereum/EthereumChainAdapter'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'

export function register(): Plugins {
  return [
    [
      'ethereumChainAdapter',
      {
        name: 'ethereumChainAdapter',
        providers: {
          chainAdapters: [
            [
              ChainTypes.Ethereum,
              () => {
                const http = new unchained.ethereum.V1Api(
                  new unchained.ethereum.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.ethereum.ParsedTx>(
                  getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
                )

                return new EthereumChainAdapter({ providers: { http, ws } })
              },
            ],
          ],
        },
      },
    ],
  ]
}
