import { TradeOpportunitiesBucket } from './components/TradeOpportunities'

export enum OpportunityTypes {
  LiquidityPool = 'liquidityPools',
  Farming = 'farming',
  BorrowingAndLending = 'borrowingAndLending',
}

export type ExternalOpportunity = {
  title: string
  apy: string
  link: string
  icons: string[]
}

export type OpportunitiesBucket = {
  type: OpportunityTypes
  title: string
  opportunities: ExternalOpportunity[]
}

// @TODO: When wiring this up, move this to foxPage.ts as icons and APY should be fetched from dynamic datas
export const otherOpportunitiesBuckets: OpportunitiesBucket[] = [
  {
    type: OpportunityTypes.LiquidityPool,
    title: 'plugins.foxPage.liquidityPools',
    opportunities: [
      {
        title: 'Uniswap',
        apy: '0.1161',
        link: '#',
        icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
      },
      {
        title: 'SushiSwap',
        apy: '0.1161',
        link: '#',
        icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
      },
    ],
  },
  {
    type: OpportunityTypes.Farming,
    title: 'plugins.foxPage.farming',
    opportunities: [
      {
        title: 'Fox Farm',
        apy: '0.1161',
        link: '#',
        icons: [
          'https://assets.coincap.io/assets/icons/fox@2x.png',
          'https://assets.coincap.io/assets/icons/fox@2x.png',
        ],
      },
    ],
  },
  {
    type: OpportunityTypes.BorrowingAndLending,
    title: 'plugins.foxPage.borrowingAndLending',
    opportunities: [
      {
        title: 'ETH-FOX',
        apy: '0.1161',
        link: '#',
        icons: [
          'https://assets.coincap.io/assets/icons/fox@2x.png',
          'https://assets.coincap.io/assets/icons/fox@2x.png',
        ],
      },
      {
        title: 'Rari Pool 79',
        apy: '0.1161',
        link: '#',
        icons: [
          'https://assets.coincap.io/assets/icons/fox@2x.png',
          'https://assets.coincap.io/assets/icons/fox@2x.png',
        ],
      },
    ],
  },
]

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
