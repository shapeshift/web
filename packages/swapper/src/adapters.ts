import { ChainId } from '@shapeshiftoss/caip'
import {
  bitcoin,
  ChainAdapter,
  ChainAdapterManager,
  cosmos,
  ethereum,
  thorchain,
} from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import dotenv from 'dotenv'

dotenv.config()

const {
  UNCHAINED_ETH_HTTPS_API = 'http://localhost:31300',
  UNCHAINED_ETH_WS_API = 'wss://localhost:31300',
  UNCHAINED_BTC_HTTPS_API = 'http://localhost:31300',
  UNCHAINED_BTC_WS_API = 'wss://localhost:31300',
  UNCHAINED_LTC_HTTPS_API = 'http://localhost:31300',
  UNCHAINED_LTC_WS_API = 'wss://localhost:31300',
  UNCHAINED_RUNE_HTTPS_API = 'http://localhost:31300',
  UNCHAINED_RUNE_WS_API = 'wss://localhost:31300',
  UNCHAINED_ATOM_HTTPS_API = 'http://localhost:31300',
  UNCHAINED_ATOM_WS_API = 'wss://localhost:31300',
  ETH_NODE_URL = 'http://localhost:31300',
} = process.env

export const getAdapterManager = () => {
  const ethChainAdapter = new ethereum.ChainAdapter({
    providers: {
      ws: new unchained.ws.Client<unchained.ethereum.Tx>(UNCHAINED_ETH_WS_API),
      http: new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({
          basePath: UNCHAINED_ETH_HTTPS_API,
        }),
      ),
    },
    rpcUrl: ETH_NODE_URL,
  })

  const btcAdapterArgs = {
    coinName: 'bitcoin',
    providers: {
      ws: new unchained.ws.Client<unchained.bitcoin.Tx>(UNCHAINED_BTC_WS_API),
      http: new unchained.bitcoin.V1Api(
        new unchained.bitcoin.Configuration({
          basePath: UNCHAINED_BTC_HTTPS_API,
        }),
      ),
    },
  }
  const bitcoinChainAdapter = new bitcoin.ChainAdapter(btcAdapterArgs)

  const ltcAdapterArgs = {
    coinName: 'litecoin',
    providers: {
      ws: new unchained.ws.Client<unchained.bitcoin.Tx>(UNCHAINED_LTC_WS_API),
      http: new unchained.bitcoin.V1Api(
        new unchained.bitcoin.Configuration({
          basePath: UNCHAINED_LTC_HTTPS_API,
        }),
      ),
    },
  }
  const litecoinChainAdapter = new bitcoin.ChainAdapter(ltcAdapterArgs)

  const runeAdapterArgs = {
    coinName: 'rune',
    providers: {
      ws: new unchained.ws.Client<unchained.thorchain.Tx>(UNCHAINED_RUNE_WS_API),
      http: new unchained.thorchain.V1Api(
        new unchained.thorchain.Configuration({
          basePath: UNCHAINED_RUNE_HTTPS_API,
        }),
      ),
    },
  }
  const thorchainChainAdapter = new thorchain.ChainAdapter(runeAdapterArgs)

  const cosmosAdapterArgs = {
    coinName: 'atom',
    providers: {
      ws: new unchained.ws.Client<unchained.thorchain.Tx>(UNCHAINED_ATOM_WS_API),
      http: new unchained.thorchain.V1Api(
        new unchained.thorchain.Configuration({
          basePath: UNCHAINED_ATOM_HTTPS_API,
        }),
      ),
    },
  }
  const cosmosChainAdapter = new cosmos.ChainAdapter(cosmosAdapterArgs)

  const adapterManager: ChainAdapterManager = new Map()
  adapterManager.set(
    KnownChainIds.BitcoinMainnet,
    bitcoinChainAdapter as unknown as ChainAdapter<ChainId>,
  )
  adapterManager.set(
    KnownChainIds.EthereumMainnet,
    ethChainAdapter as unknown as ChainAdapter<ChainId>,
  )
  adapterManager.set(
    KnownChainIds.ThorchainMainnet,
    thorchainChainAdapter as unknown as ChainAdapter<ChainId>,
  )
  adapterManager.set(
    KnownChainIds.LitecoinMainnet,
    litecoinChainAdapter as unknown as ChainAdapter<ChainId>,
  )
  adapterManager.set(
    KnownChainIds.CosmosMainnet,
    cosmosChainAdapter as unknown as ChainAdapter<ChainId>,
  )
  return adapterManager
}
