import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLTcyClaim = {
  asset: string
  amount: string
  l1Address: string
}

const GET_TCY_CLAIMS = gql`
  query GetTcyClaims($addresses: [String!]!) {
    tcyClaims(addresses: $addresses) {
      asset
      amount
      l1Address
    }
  }
`

type TcyClaimsResponse = {
  tcyClaims: GraphQLTcyClaim[]
}

export async function fetchTcyClaimsGraphQL(addresses: string[]): Promise<GraphQLTcyClaim[]> {
  if (addresses.length === 0) return []

  const client = getGraphQLClient()
  const response = await client.request<TcyClaimsResponse>(GET_TCY_CLAIMS, { addresses })
  return response.tcyClaims
}

export type AddressToAccountIdMap = Map<string, string>

export async function fetchTcyClaimsWithAccountMapping(
  addressToAccountId: AddressToAccountIdMap,
): Promise<{ claims: GraphQLTcyClaim[]; addressToAccountId: AddressToAccountIdMap }> {
  const addresses = Array.from(addressToAccountId.keys())
  const claims = await fetchTcyClaimsGraphQL(addresses)
  return { claims, addressToAccountId }
}
