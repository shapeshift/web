import type { MarketData } from '@shapeshiftoss/types'

import type { OsmosisMarketCap } from './osmosis-types'

export const secretNetwork: OsmosisMarketCap = {
  price: 4.5456667708,
  denom: 'ibc/0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A',
  symbol: 'SCRT',
  liquidity: 17581752.09948758,
  liquidity_24h_change: -12.8145359477,
  volume_24h: 3289855.395915219,
  volume_24h_change: 2479142.2564111263,
  name: 'Secret Network',
  price_24h_change: -15.4199369882,
}

export const ion: OsmosisMarketCap = {
  price: 7110.2708806483,
  denom: 'uion',
  symbol: 'ION',
  liquidity: 8737040.33551496,
  liquidity_24h_change: -14.0724963209,
  volume_24h: 353672.5116333088,
  volume_24h_change: 177537.462938586,
  name: 'Ion',
  price_24h_change: -15.5060091033,
}

export const osmo: OsmosisMarketCap = {
  price: 8.0939512289,
  denom: 'uosmo',
  symbol: 'OSMO',
  liquidity: 513382677.98398143,
  liquidity_24h_change: -7.0051901726,
  volume_24h: 169020038.66921267,
  volume_24h_change: 85749118.40114057,
  name: 'Osmosis',
  price_24h_change: -8.5460553557,
}

export const mockOsmosisFindAllData = {
  data: [secretNetwork, ion, osmo],
}

export const mockOsmosisFindByAssetIdData: MarketData = {
  price: '8.0939512289',
  marketCap: '513382677.98398143',
  volume: '169020038.66921267',
  changePercent24Hr: -8.5460553557,
}

export const mockOsmosisYearlyHistoryData = [
  {
    time: 1624492800,
    close: 5.4010989774,
    high: 5.4141295587,
    low: 5.0003632977,
    open: 5.0003632977,
  },
  {
    time: 1624579200,
    close: 7.3442392291,
    high: 7.3448735644,
    low: 5.3572962709,
    open: 5.4010989774,
  },
  {
    time: 1624665600,
    close: 6.2011885916,
    high: 7.5765008227,
    low: 6.0288315142,
    open: 7.3442142218,
  },
  {
    time: 1624752000,
    close: 5.3994292528,
    high: 6.2012808102,
    low: 5.0807420392,
    open: 6.2011885916,
  },
]

export const mockHourlyHistoryData = [
  {
    time: 1645279200,
    close: 8.7099702887,
    high: 8.7230634538,
    low: 8.7027347275,
    open: 8.7230634538,
    volume: 322395.5646646317,
  },
  {
    time: 1645282800,
    close: 8.720258958,
    high: 8.7281887188,
    low: 8.7088941334,
    open: 8.7099702887,
    volume: 215774.9291578648,
  },
  {
    time: 1645286400,
    close: 8.7551263817,
    high: 8.8301414047,
    low: 8.7183602443,
    open: 8.7202062522,
    volume: 544372.0382400643,
  },
  {
    time: 1645290000,
    close: 8.7544961127,
    high: 8.7584181833,
    low: 8.7271467319,
    open: 8.7551263817,
    volume: 303458.094971553,
  },
]
