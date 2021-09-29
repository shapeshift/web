import { ContractTypes, NetworkTypes, ChainTypes, Asset } from '@shapeshiftoss/asset-service'
import { DEFAULT_SLIPPAGE } from '../constants'

export const setupQuote = () => {
  const sellAsset = ({
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
    receiveSupport: true,
    symbol: 'FOX'
    // TODO: remove the type casts from test files when we unify `ChainTypes` and `ChainIdentifier`
  } as unknown) as Asset
  const buyAsset = ({
    name: 'WETH',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    precision: 18,
    tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'WETH'
  } as unknown) as Asset

  const quoteInput = {
    sellAsset,
    buyAsset,
    success: true,
    sellAmount: '1000000000000000000',
    slippage: DEFAULT_SLIPPAGE,
    allowanceContract: '0xDd4a7cc4092515C130667C1bFd53Be0DE91062C5',
    receiveAddress: '0x22d76bB60B70fF2F3aD698a753EC7E64aeB0426C',
    sellAssetAccountId: 'sellAccountId',
    buyAssetAccountId: 'buyAccountId'
  }
  return { quoteInput, buyAsset, sellAsset }
}
