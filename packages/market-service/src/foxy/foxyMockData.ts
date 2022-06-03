import { CoinCapMarketCap } from '../coincap/coincap-types'

export const fox: CoinCapMarketCap = {
  id: 'fox-token',
  rank: '327',
  symbol: 'FOX',
  name: 'FOX Token',
  supply: '272087306.9154830000000000',
  maxSupply: '1000001337.0000000000000000',
  marketCapUsd: '76043211.3383411704757409',
  volumeUsd24Hr: '809217.5632748945831009',
  priceUsd: '0.2794809217688426',
  changePercent24Hr: '2.8107676052084740',
  vwap24Hr: '0.2717415151864480',
  explorer: 'https://etherscan.io/token/0xc770eefad204b5180df6a14ee197d99d808ee52d'
}

export const mockFoxyMarketData = {
  changePercent24Hr: 2.810767605208474,
  marketCap: '0',
  price: '0.2794809217688426',
  volume: '0',
  supply: '52018758.965754575223841191',
  maxSupply: '502526240.759422886301171305'
}

export const mockFoxyPriceHistoryData = [
  { time: 1623110400000, priceUsd: 0.480621954029937 },
  { time: 1623196800000, priceUsd: 0.48541321175453755 },
  { time: 1623283200000, priceUsd: 0.4860349080635926 },
  { time: 1623369600000, priceUsd: 0.46897407484696146 },
  { time: 1623456000000, priceUsd: 0.4569204315609752 }
]
