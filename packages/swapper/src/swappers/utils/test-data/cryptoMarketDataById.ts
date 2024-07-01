import {
  AVAX,
  BSC,
  BTC,
  ETH,
  FOX_GNOSIS,
  FOX_MAINNET,
  OPTIMISM,
  RUNE,
  USDC_GNOSIS,
  USDC_MAINNET,
  WBTC,
  WETH,
} from './assets'

export const marketDataByAssetIdUsd = {
  [FOX_MAINNET.assetId]: { price: '0.04' },
  [FOX_GNOSIS.assetId]: { price: '0.04' },
  [ETH.assetId]: { price: '1300' },
  [AVAX.assetId]: { price: '14.63' },
  [BSC.assetId]: { price: '308.33' },
  [BTC.assetId]: { price: '26836' },
  [RUNE.assetId]: { price: '1.17' },
  [OPTIMISM.assetId]: { price: '1.69' },
  [USDC_MAINNET.assetId]: { price: '1.00' },
  [USDC_GNOSIS.assetId]: { price: '1.00' },
  [WBTC.assetId]: { price: '26783' },
  [WETH.assetId]: { price: '1300' },
}
