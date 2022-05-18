import { toAssetId, toChainId } from '@shapeshiftoss/caip'
import { AssetDataSource, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'

export const getUniswapV2Pools = (): TokenAsset[] => {
  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const assetNamespace = 'erc20'
  const assetReference = '0x470e8de2ebaef52014a47cb5e6af86884947f08c' // Uniswap V2 - FOX/WETH contract address

  const result: TokenAsset = {
    assetId: toAssetId({
      chain,
      network,
      assetNamespace,
      assetReference
    }),
    chainId: toChainId({ chain, network }),
    dataSource: AssetDataSource.CoinGecko,
    name: 'Uniswap V2 - FOX/WETH',
    precision: 18,
    tokenId: assetReference,
    contractType: assetNamespace,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/uni.png',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'UNI-V2-FOX-WETH'
  }

  return [result]
}
