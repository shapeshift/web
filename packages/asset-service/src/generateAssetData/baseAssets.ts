import {
  AssetDataSource,
  BaseAsset,
  ChainTypes,
  ContractTypes,
  NetworkTypes
} from '@shapeshiftoss/types'

export const baseAssets: Array<BaseAsset> = [
  {
    caip19: 'eip155:1/slip44:60',
    chain: ChainTypes.Ethereum,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    slip44: 60,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true
  },
  {
    caip19: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chain: ChainTypes.Bitcoin,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.MAINNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    slip44: 0,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    sendSupport: false,
    receiveSupport: false
  },
  {
    caip19: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
    chain: ChainTypes.Bitcoin,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.TESTNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    slip44: 1,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com/btc-testnet/',
    explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/',
    explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
    sendSupport: false,
    receiveSupport: false
  },
  {
    caip19: 'eip155:3/slip44:60',
    chain: ChainTypes.Ethereum,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.ETH_ROPSTEN,
    symbol: 'ETH',
    name: 'Ropsten Testnet Ethereum',
    precision: 18,
    slip44: 1,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://ropsten.etherscan.io/',
    explorerAddressLink: 'https://ropsten.etherscan.io/address/',
    explorerTxLink: 'https://ropsten.etherscan.io/tx/',
    sendSupport: false,
    receiveSupport: false,
    tokens: [
      {
        caip19: 'eip155:3/erc20:0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
        name: 'Test Token',
        precision: 18,
        tokenId: '0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
        contractType: ContractTypes.ERC20,
        color: '#FFFFFF',
        dataSource: AssetDataSource.CoinGecko,
        secondaryColor: '#FFFFFF',
        icon: 'https://assets.coingecko.com/coins/images/17049/thumb/BUNNY.png?1626148809',
        sendSupport: true,
        receiveSupport: true,
        symbol: 'TST'
      }
    ]
  }
]
