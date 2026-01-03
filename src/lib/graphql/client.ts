import { GraphQLClient } from 'graphql-request'

import { getConfig } from '@/config'

let graphQLClient: GraphQLClient | null = null

export function getGraphQLClient(): GraphQLClient {
  if (!graphQLClient) {
    graphQLClient = new GraphQLClient(getConfig().VITE_GRAPHQL_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  return graphQLClient
}
