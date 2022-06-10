import { ethereum } from '@shapeshiftoss/chain-adapters'
import * as unchained from '@shapeshiftoss/unchained-client'
import Web3 from 'web3'

jest.mock('@shapeshiftoss/chain-adapters')

export const setupZrxDeps = () => {
  const ethChainAdapter = new ethereum.ChainAdapter({
    providers: {
      ws: new unchained.ws.Client<unchained.ethereum.EthereumTx>(
        'wss://dev-api.ethereum.shapeshift.com'
      ),
      http: new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({
          basePath: 'https://dev-api.ethereum.shapeshift.com'
        })
      )
    },
    rpcUrl: 'https://mainnet.infura.io/v3/d734c7eebcdf400185d7eb67322a7e57'
  })

  const ethNodeUrl = 'http://localhost:1000'
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)

  return { web3: new Web3(web3Provider), adapter: ethChainAdapter }
}
