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

export type OpportunitiesChunk = {
  type: OpportunityTypes
  title: string
  opportunities: ExternalOpportunity[]
}

// @TODO: When wiring this up, move this to foxPage.ts as icons and APY should be fetched from dynamic datas
export const otherOpportunitiesChunks: OpportunitiesChunk[] = [
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
