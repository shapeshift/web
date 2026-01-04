import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLBorrower = {
  owner: string
  asset: string
  debtIssued: string
  debtRepaid: string
  debtCurrent: string
  collateralDeposited: string
  collateralWithdrawn: string
  collateralCurrent: string
  lastOpenHeight: number
  lastRepayHeight: number
}

export type GraphQLSaver = {
  asset: string
  assetAddress: string
  lastAddHeight: number
  units: string
  assetDepositValue: string
  assetRedeemValue: string
  growthPct: string
}

const GET_POOL_BORROWERS = gql`
  query GetPoolBorrowers($asset: String!) {
    thornode {
      borrowers(asset: $asset) {
        owner
        asset
        debtIssued
        debtRepaid
        debtCurrent
        collateralDeposited
        collateralWithdrawn
        collateralCurrent
        lastOpenHeight
        lastRepayHeight
      }
    }
  }
`

const GET_POOL_SAVERS = gql`
  query GetPoolSavers($asset: String!) {
    thornode {
      savers(asset: $asset) {
        asset
        assetAddress
        lastAddHeight
        units
        assetDepositValue
        assetRedeemValue
        growthPct
      }
    }
  }
`

type PoolBorrowersResponse = {
  thornode: {
    borrowers: GraphQLBorrower[]
  }
}

type PoolSaversResponse = {
  thornode: {
    savers: GraphQLSaver[]
  }
}

export async function fetchPoolBorrowersGraphQL(poolAssetId: string): Promise<GraphQLBorrower[]> {
  const client = getGraphQLClient()
  const response = await client.request<PoolBorrowersResponse>(GET_POOL_BORROWERS, {
    asset: poolAssetId,
  })
  console.log(
    '[fetchPoolBorrowersGraphQL] Received',
    response.thornode.borrowers.length,
    'borrowers',
  )
  return response.thornode.borrowers
}

export async function fetchPoolSaversGraphQL(poolAssetId: string): Promise<GraphQLSaver[]> {
  const client = getGraphQLClient()
  const response = await client.request<PoolSaversResponse>(GET_POOL_SAVERS, {
    asset: poolAssetId,
  })
  console.log('[fetchPoolSaversGraphQL] Received', response.thornode.savers.length, 'savers')
  return response.thornode.savers
}
