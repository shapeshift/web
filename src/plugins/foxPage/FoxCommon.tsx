export enum OpportunityTypes {
  LiquidityPool = 'liquidityPool',
  Farming = 'farming',
  BorrowingAndLending = 'borrowingAndLending',
}

export type ExternalOpportunity = {
  type: OpportunityTypes
  title: string
  apy: string
  link: string
  icons: string[]
}

export const OpportunityTypeTitles = {
  [OpportunityTypes.LiquidityPool]: 'plugins.foxPage.liquidityPools',
  [OpportunityTypes.Farming]: 'plugins.foxPage.farming',
  [OpportunityTypes.BorrowingAndLending]: 'plugins.foxPage.borrowingAndLending',
}

export type FoxOpportunities = [ExternalOpportunity[], ExternalOpportunity[], ExternalOpportunity[]]

// @TODO: When wiring this up, move this to foxPage.ts as icons and APY should be fetched from dynamic datas
export const otherOpportunitiesChunks: FoxOpportunities = [
  [
    {
      type: OpportunityTypes.LiquidityPool,
      title: 'Uniswap',
      apy: '0.1161',
      link: '#',
      icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
    },
    {
      type: OpportunityTypes.LiquidityPool,
      title: 'SushiSwap',
      apy: '0.1161',
      link: '#',
      icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
    },
  ],
  [
    {
      type: OpportunityTypes.Farming,
      title: 'Fox Farm',
      apy: '0.1161',
      link: '#',
      icons: [
        'https://assets.coincap.io/assets/icons/fox@2x.png',
        'https://assets.coincap.io/assets/icons/fox@2x.png',
      ],
    },
  ],
  [
    {
      type: OpportunityTypes.BorrowingAndLending,
      title: 'ETH-FOX',
      apy: '0.1161',
      link: '#',
      icons: [
        'https://assets.coincap.io/assets/icons/fox@2x.png',
        'https://assets.coincap.io/assets/icons/fox@2x.png',
      ],
    },
    {
      type: OpportunityTypes.BorrowingAndLending,
      title: 'Rari Pool 79',
      apy: '0.1161',
      link: '#',
      icons: [
        'https://assets.coincap.io/assets/icons/fox@2x.png',
        'https://assets.coincap.io/assets/icons/fox@2x.png',
      ],
    },
  ],
]
