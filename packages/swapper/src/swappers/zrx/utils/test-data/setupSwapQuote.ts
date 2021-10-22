import { ContractTypes, NetworkTypes, ChainTypes } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from '../constants'

export const setupQuote = () => {
  const sellAsset = {
    name: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    precision: 18,
    tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'FOX'
  }
  const buyAsset = {
    name: 'WETH',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    precision: 18,
    tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'WETH'
  }

  const quoteInput = {
    sellAsset,
    buyAsset,
    success: true,
    sellAmount: '1000000000000000000',
    slippage: DEFAULT_SLIPPAGE,
    allowanceContract: '0xDd4a7cc4092515C130667C1bFd53Be0DE91062C5',
    receiveAddress: '0x22d76bB60B70fF2F3aD698a753EC7E64aeB0426C',
    sellAssetAccountId: '0',
    buyAssetAccountId: '0'
  }
  return { quoteInput, buyAsset, sellAsset }
}
