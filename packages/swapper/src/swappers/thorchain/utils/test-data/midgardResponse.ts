import { InboundResponse, PoolResponse } from '../../types'

export const btcMidgardPool: PoolResponse = {
  asset: 'BTC.BTC',
  assetDepth: '91027798705',
  assetPrice: '10280.68095465986',
  assetPriceUSD: '29850.505131750208',
  liquidityUnits: '536055974608843',
  poolAPY: '0.09305294391574037',
  runeDepth: '935827756491105',
  status: 'available',
  synthSupply: '3281284823',
  synthUnits: '9838954536080',
  units: '545894929144923',
  volume24h: '15031085906495'
}

export const ethMidgardPool: PoolResponse = {
  asset: 'ETH.ETH',
  assetDepth: '915018987646',
  assetPrice: '676.2118757936507',
  assetPriceUSD: '1963.4172247490626',
  liquidityUnits: '273709963437801',
  poolAPY: '0.10532151323548256',
  runeDepth: '618746706022909',
  status: 'available',
  synthSupply: '3572065751',
  synthUnits: '535301524652',
  units: '274245264962453',
  volume24h: '9890096673763'
}

export const foxMidgardPool: PoolResponse = {
  asset: 'ETH.FOX-0XC770EEFAD204B5180DF6A14EE197D99D808EE52D',
  assetDepth: '166650912393467',
  assetPrice: '0.05303710198887871',
  assetPriceUSD: '0.15399605260336216',
  liquidityUnits: '10015457121887',
  poolAPY: '0.2597568967423438',
  runeDepth: '8838681437152',
  status: 'available',
  synthSupply: '17428372569375',
  synthUnits: '552604585625',
  units: '10568061707512',
  volume24h: '251596933033'
}

export const mockInboundAdresses: InboundResponse[] = [
  {
    chain: 'BCH',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'qp5a6rn8zmamgmsyspqsl0p6ktk4hrheggdjdvntv0',
    halted: false,
    gas_rate: '3'
  },
  {
    chain: 'BNB',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'bnb1d8wsuecklw6xupyqgy8mcw4ja4dca72z7nvqzw',
    halted: false,
    gas_rate: '11250'
  },
  {
    chain: 'BTC',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'bc1qd8wsuecklw6xupyqgy8mcw4ja4dca72z2dd88d',
    halted: false,
    gas_rate: '18'
  },
  {
    chain: 'DOGE',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'DEnrJfAjC4KMsLsGtoTGSmYaFZLPunWw9q',
    halted: false,
    gas_rate: '550384'
  },
  {
    chain: 'ETH',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: '0x78e4e10dcacb0a8261eb3d5e57ffb98ae8d4dff1',
    router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
    halted: false,
    gas_rate: '280'
  },
  {
    chain: 'LTC',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'ltc1qd8wsuecklw6xupyqgy8mcw4ja4dca72zw3hrla',
    halted: false,
    gas_rate: '60'
  },
  {
    chain: 'TERRA',
    pub_key: 'thorpub1addwnpepqfyppkehky2hn2gy26y8jqyj9fz0rnvau2r7yueawzvc662w0x9s7n4ypra',
    address: 'terra1d8wsuecklw6xupyqgy8mcw4ja4dca72z6nfvpq',
    halted: true,
    gas_rate: '182523800'
  }
]

export const poolResponse: PoolResponse[] = [btcMidgardPool, ethMidgardPool, foxMidgardPool]
