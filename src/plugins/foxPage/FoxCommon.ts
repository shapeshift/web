import { TradeOpportunitiesBucket } from './components/TradeOpportunities'

export const FOX_ASSET_ID = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const FOXY_ASSET_ID = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'
export const TrimmedDescriptionLength = 191

export enum OpportunityTypes {
  LiquidityPool = 'liquidityPools',
  Farming = 'farming',
  BorrowingAndLending = 'borrowingAndLending',
}

export type ExternalOpportunity = {
  title: string
  apy?: string | null
  link: string
  icons: string[]
  isLoaded?: boolean
  isDisabled?: boolean
}

export type OpportunitiesBucket = {
  type: OpportunityTypes
  title: string
  opportunities: ExternalOpportunity[]
}

export const foxTradeOpportunitiesBuckets: TradeOpportunitiesBucket[] = [
  {
    title: 'plugins.foxPage.dex',
    opportunities: [
      {
        link: 'https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xc770eefad204b5180df6a14ee197d99d808ee52d&chain=mainnet',
        icon: 'uniswap.png',
      },
      {
        link: 'https://app.thorswap.finance/swap/ETH.ETH_ETH.FOX-0XC770EEFAD204B5180DF6A14EE197D99D808EE52D',
        icon: 'thorswap.png',
      },
    ],
  },
  {
    title: 'plugins.foxPage.centralized',
    opportunities: [
      {
        link: 'https://www.coinbase.com/price/fox-token',
        icon: 'coinbase.png',
      },
    ],
  },
]

export const foxyTradeOpportunitiesBuckets: TradeOpportunitiesBucket[] = [
  {
    title: 'plugins.foxPage.dex',
    opportunities: [
      {
        link: 'https://elasticswap.org/',
        icon: 'elasticswap.png',
      },
    ],
  },
]
