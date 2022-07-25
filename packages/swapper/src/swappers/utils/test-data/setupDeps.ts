import { ethAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import * as unchained from '@shapeshiftoss/unchained-client'
import Web3 from 'web3'

import { WETH } from './assets'

jest.mock('@shapeshiftoss/chain-adapters')
jest.mock('web3')

export const setupDeps = () => {
  const ethChainAdapter = new ethereum.ChainAdapter({
    providers: {
      ws: new unchained.ws.Client<unchained.ethereum.Tx>('wss://dev-api.ethereum.shapeshift.com'),
      http: new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({
          basePath: 'https://dev-api.ethereum.shapeshift.com'
        })
      )
    },
    rpcUrl: 'https://mainnet.infura.io/v3/d734c7eebcdf400185d7eb67322a7e57'
  })

  ethChainAdapter.getFeeAssetId = () => ethAssetId

  const ethNodeUrl = 'http://localhost:1000'
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)

  return { web3: new Web3(web3Provider), adapter: ethChainAdapter, feeAsset: WETH }
}
