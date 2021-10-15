import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

export const BTC = {
  name: 'bitcoin',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.MAINNET,
  precision: 8,
  slip44: 0,
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  sendSupport: false,
  receiveSupport: false,
  symbol: 'BTC'
}
export const WETH = {
  name: 'WETH',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
  slip44: 0,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true,
  symbol: 'WETH'
}
export const FOX = {
  name: 'Fox',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  sendSupport: true,
  slip44: 0,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  receiveSupport: true,
  symbol: 'FOX'
}
export const USDC = {
  name: 'USD Coin',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 6,
  tokenId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true,
  symbol: 'USDC',
  slip44: 60
}

export const QUOTE = {
  sellAsset: WETH,
  buyAsset: USDC,
  priceImpact: '0.00353623343019489995',
  success: true,
  statusCode: 0,
  rate: '3839.269108',
  minimum: '0.000259545173425274',
  maximum: '100000000000000000000000000',
  feeData: {
    fee: '153244500000000000',
    estimatedGas: '424500',
    gasPrice: '361000000000'
  },
  sellAmount: '324000000000000000000',
  buyAmount: '1243923191084',
  sources: [
    {
      name: 'Uniswap_V3',
      proportion: '1'
    }
  ]
}
