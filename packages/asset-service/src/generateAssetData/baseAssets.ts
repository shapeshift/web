import { BaseAsset, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

export const baseAssets: Array<BaseAsset> = [
  {
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
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
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.MAINNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    slip44: 0,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    sendSupport: false,
    receiveSupport: false
  },
  {
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.TESTNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    slip44: 1,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com/btc-testnet/',
    explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
    sendSupport: false,
    receiveSupport: false
  },
  {
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    symbol: 'ETH',
    name: 'Ropsten Testnet Ethereum',
    precision: 18,
    slip44: 1,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://ropsten.etherscan.io/',
    explorerTxLink: 'https://ropsten.etherscan.io/tx/',
    sendSupport: false,
    receiveSupport: false,
    tokens: [
      {
        name: 'Test Token',
        precision: 18,
        tokenId: '0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
        contractType: ContractTypes.ERC20,
        color: '#FFFFFF',
        secondaryColor: '#FFFFFF',
        icon: 'https://assets.coingecko.com/coins/images/17049/thumb/BUNNY.png?1626148809',
        sendSupport: true,
        receiveSupport: true,
        symbol: 'TST'
      }
    ]
  }
]
