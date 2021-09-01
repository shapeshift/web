import { BaseAsset } from './types'

export const baseAssets: Array<BaseAsset> = [
  {
    chain: 'ETH',
    network: 'mainnet',
    symbol: 'ETH',
    displayName: 'Ethereum',
    precision: 18,
    slip44: 60,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true
  },
  {
    chain: 'BTC',
    network: 'mainnet',
    symbol: 'BTC',
    displayName: 'Bitcoin',
    precision: 8,
    slip44: 0,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    sendSupport: false,
    receiveSupport: false
  }
]
