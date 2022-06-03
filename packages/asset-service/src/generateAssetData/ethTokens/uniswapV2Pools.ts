import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const getUniswapV2Pools = (): Asset[] => {
  const assetNamespace = 'erc20'
  const assetReference = '0x470e8de2ebaef52014a47cb5e6af86884947f08c' // Uniswap V2 - FOX/WETH contract address

  const result: Asset = {
    assetId: toAssetId({
      chainId,
      assetNamespace,
      assetReference
    }),
    chainId,
    name: 'Uniswap V2 - FOX/WETH',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/uni.png',
    symbol: 'UNI-V2-FOX-WETH',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET
  }

  return [result]
}
