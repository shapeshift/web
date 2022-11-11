import { getConfig } from 'config'
import Web3 from 'web3'
export const web3ByChainId = (chainId: number) => {
  if (chainId === 1) {
    return {
      web3: new Web3(new Web3.providers.HttpProvider(getConfig().REACT_APP_ETHEREUM_INFURA_URL)),
      symbol: 'ETH',
      name: 'Ethereum',
      coinGeckoId: 'ethereum',
    }
  } else if (chainId === 5) {
    return {
      web3: new Web3(
        new Web3.providers.HttpProvider(
          `https://goerli.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
        ),
      ),
      symbol: 'ETH',
      name: 'Ethereum',
      coinGeckoId: 'ethereum',
    }
  } else if (chainId === 43114) {
    return {
      web3: new Web3(
        new Web3.providers.HttpProvider(
          `https://avalanche-mainnet.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
        ),
      ),
      symbol: 'AVAX',
      name: 'Avalanche',
      coinGeckoId: 'avalanche-2',
    }
  } else if (chainId === 137) {
    return {
      web3: new Web3(new Web3.providers.HttpProvider(`https://rpc-mainnet.matic.quiknode.pro`)),
      symbol: 'MATIC',
      name: 'Polygon',
      coinGeckoId: 'matic-network',
    }
  } else if (chainId === 100) {
    return {
      web3: new Web3(new Web3.providers.HttpProvider(`https://rpc.ankr.com/gnosis`)),
      symbol: 'XDAI',
      name: 'Gnosis',
      coinGeckoId: 'xdai',
    }
  } else {
    throw new Error('unsupported chain id')
  }
}
