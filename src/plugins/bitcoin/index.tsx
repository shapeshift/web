import { ChainAdapter as BitcoinChainAdapter } from '@shapeshiftoss/chain-adapters/dist/bitcoin/BitcoinChainAdapter'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'

export function register(): Plugins {
  return [
    [
      'bitcoinChainAdapter',
      {
        name: 'bitcoinChainAdapter',
        providers: {
          chainAdapters: [
            [
              ChainTypes.Bitcoin,
              () => {
                const http = new unchained.bitcoin.V1Api(
                  new unchained.ethereum.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_BITCOIN_HTTP_URL
                  })
                )

                const ws = new unchained.ws.Client<unchained.Tx>(
                  getConfig().REACT_APP_UNCHAINED_BITCOIN_WS_URL
                )

                return new BitcoinChainAdapter({ providers: { http, ws }, coinName: 'Bitcoin' })
              }
            ]
          ]
        }
      }
    ]
  ]
}
