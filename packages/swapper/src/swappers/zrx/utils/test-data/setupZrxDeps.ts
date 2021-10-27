import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import Web3 from 'web3'

export const setupZrxDeps = () => {
  const unchainedUrls = {
    [ChainTypes.Bitcoin]: {
      httpUrl: 'https://api.bitcoin.shapeshift.com',
      wsUrl: 'wss://api.bitcoin.shapeshift.com'
    },
    [ChainTypes.Ethereum]: {
      httpUrl: 'https://api.ethereum.shapeshift.com',
      wsUrl: 'wss://api.ethereum.shapeshift.com'
    }
  }
  const ethNodeUrl = 'http://localhost:1000'
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3Instance = new Web3(web3Provider)

  return { web3Instance, adapterManager }
}
