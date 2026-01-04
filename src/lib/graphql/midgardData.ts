import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLMidgardPool = {
  asset: string
  annualPercentageRate: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  nativeDecimal: string
  poolAPY: string
  runeDepth: string
  saversAPR: string
  saversDepth: string
  saversUnits: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

export type GraphQLMidgardMemberPool = {
  assetAdded: string
  assetAddress: string
  assetDeposit: string
  assetPending: string
  assetWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
  liquidityUnits: string
  pool: string
  runeAdded: string
  runeAddress: string
  runeDeposit: string
  runePending: string
  runeWithdrawn: string
}

export type GraphQLMidgardMember = {
  pools: GraphQLMidgardMemberPool[]
}

export type GraphQLMidgardRunepoolMember = {
  runeAddress: string
  units: string
  runeAdded: string
  runeDeposit: string
  runeWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
}

type MidgardPoolPeriod =
  | 'HOUR_1'
  | 'HOUR_24'
  | 'DAY_7'
  | 'DAY_14'
  | 'DAY_30'
  | 'DAY_90'
  | 'DAY_100'
  | 'DAY_180'
  | 'DAY_365'
  | 'ALL'

const GET_MIDGARD_POOLS = gql`
  query GetMidgardPools($period: MidgardPoolPeriod) {
    midgard {
      pools(period: $period) {
        asset
        annualPercentageRate
        assetDepth
        assetPrice
        assetPriceUSD
        liquidityUnits
        nativeDecimal
        poolAPY
        runeDepth
        saversAPR
        saversDepth
        saversUnits
        status
        synthSupply
        synthUnits
        units
        volume24h
      }
    }
  }
`

const GET_MIDGARD_MEMBER = gql`
  query GetMidgardMember($address: String!) {
    midgard {
      member(address: $address) {
        pools {
          assetAdded
          assetAddress
          assetDeposit
          assetPending
          assetWithdrawn
          dateFirstAdded
          dateLastAdded
          liquidityUnits
          pool
          runeAdded
          runeAddress
          runeDeposit
          runePending
          runeWithdrawn
        }
      }
    }
  }
`

const GET_MIDGARD_RUNEPOOL_MEMBER = gql`
  query GetMidgardRunepoolMember($address: String!) {
    midgard {
      runepoolMember(address: $address) {
        runeAddress
        units
        runeAdded
        runeDeposit
        runeWithdrawn
        dateFirstAdded
        dateLastAdded
      }
    }
  }
`

type MidgardPoolsResponse = {
  midgard: {
    pools: GraphQLMidgardPool[]
  }
}

type MidgardMemberResponse = {
  midgard: {
    member: GraphQLMidgardMember | null
  }
}

type MidgardRunepoolMemberResponse = {
  midgard: {
    runepoolMember: GraphQLMidgardRunepoolMember | null
  }
}

const periodMap: Record<string, MidgardPoolPeriod> = {
  '1h': 'HOUR_1',
  '24h': 'HOUR_24',
  '7d': 'DAY_7',
  '14d': 'DAY_14',
  '30d': 'DAY_30',
  '90d': 'DAY_90',
  '100d': 'DAY_100',
  '180d': 'DAY_180',
  '365d': 'DAY_365',
  all: 'ALL',
}

export async function fetchMidgardPoolsGraphQL(period?: string): Promise<GraphQLMidgardPool[]> {
  try {
    const client = getGraphQLClient()
    const graphqlPeriod = period ? periodMap[period] : undefined
    const response = await client.request<MidgardPoolsResponse>(GET_MIDGARD_POOLS, {
      period: graphqlPeriod,
    })
    return response.midgard.pools
  } catch (error) {
    console.error('[GraphQL Midgard] Failed to fetch pools:', error)
    throw error
  }
}

export async function fetchMidgardMemberGraphQL(
  address: string,
): Promise<GraphQLMidgardMember | null> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<MidgardMemberResponse>(GET_MIDGARD_MEMBER, {
      address,
    })
    return response.midgard.member
  } catch (error) {
    console.error('[GraphQL Midgard] Failed to fetch member:', error)
    throw error
  }
}

export async function fetchMidgardRunepoolMemberGraphQL(
  address: string,
): Promise<GraphQLMidgardRunepoolMember | null> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<MidgardRunepoolMemberResponse>(
      GET_MIDGARD_RUNEPOOL_MEMBER,
      { address },
    )
    return response.midgard.runepoolMember
  } catch (error) {
    console.error('[GraphQL Midgard] Failed to fetch runepool member:', error)
    throw error
  }
}
