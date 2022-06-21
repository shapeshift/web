import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'

import { ethereum } from '../baseAssets'

export const getUniswapV2Pools = (): Asset[] => {
  const foxWeth: Asset = {
    assetId: toAssetId({
      chainId,
      assetNamespace: 'erc20',
      assetReference: '0x470e8de2ebaef52014a47cb5e6af86884947f08c'
    }),
    chainId,
    name: 'Uniswap V2 - FOX/WETH',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/uni.png',
    symbol: 'UNI-V2-FOX-WETH',
    explorer: ethereum.explorer,
    explorerAddressLink: ethereum.explorerAddressLink,
    explorerTxLink: ethereum.explorerTxLink
  }

  return [foxWeth]
}
