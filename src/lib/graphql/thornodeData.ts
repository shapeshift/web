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
    thornodePoolBorrowers(asset: $asset) {
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
`

const GET_POOL_SAVERS = gql`
  query GetPoolSavers($asset: String!) {
    thornodePoolSavers(asset: $asset) {
      asset
      assetAddress
      lastAddHeight
      units
      assetDepositValue
      assetRedeemValue
      growthPct
    }
  }
`

type PoolBorrowersResponse = {
  thornodePoolBorrowers: GraphQLBorrower[]
}

type PoolSaversResponse = {
  thornodePoolSavers: GraphQLSaver[]
}

export async function fetchPoolBorrowersGraphQL(poolAssetId: string): Promise<GraphQLBorrower[]> {
  const client = getGraphQLClient()
  const response = await client.request<PoolBorrowersResponse>(GET_POOL_BORROWERS, {
    asset: poolAssetId,
  })
  console.log(
    '[fetchPoolBorrowersGraphQL] Received',
    response.thornodePoolBorrowers.length,
    'borrowers',
  )
  return response.thornodePoolBorrowers
}

export async function fetchPoolSaversGraphQL(poolAssetId: string): Promise<GraphQLSaver[]> {
  const client = getGraphQLClient()
  const response = await client.request<PoolSaversResponse>(GET_POOL_SAVERS, {
    asset: poolAssetId,
  })
  console.log('[fetchPoolSaversGraphQL] Received', response.thornodePoolSavers.length, 'savers')
  return response.thornodePoolSavers
}
