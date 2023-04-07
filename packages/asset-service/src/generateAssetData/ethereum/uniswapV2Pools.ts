import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'

import { Asset } from '../../service/AssetService'
import { ethereum } from '../baseAssets'
import { colorMap } from '../colorMap'

export const getUniswapV2Pools = (): Asset[] => {
  const assetNamespace = 'erc20'
  const assetReference = '0x470e8de2ebaef52014a47cb5e6af86884947f08c' // Uniswap V2 - FOX/WETH contract address
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const foxWeth: Asset = {
    assetId,
    chainId,
    name: 'ETH/FOX Pool',
    precision: 18,
    color: colorMap[assetId] ?? '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/uni.png',
    symbol: 'UNI-V2',
    explorer: ethereum.explorer,
    explorerAddressLink: ethereum.explorerAddressLink,
    explorerTxLink: ethereum.explorerTxLink,
  }

  return [foxWeth]
}
