import { GraphQLClient } from 'graphql-request'
import type { Client as WsClient } from 'graphql-ws'
import { createClient } from 'graphql-ws'

import { getConfig } from '@/config'

let graphQLClient: GraphQLClient | null = null
let wsClient: WsClient | null = null

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

export function getGraphQLWsClient(): WsClient {
  if (!wsClient) {
    const httpEndpoint = getConfig().VITE_GRAPHQL_ENDPOINT
    const wsEndpoint = httpEndpoint.replace(/^http/, 'ws')

    console.log('[GraphQL WS] Creating WebSocket client for:', wsEndpoint)

    wsClient = createClient({
      url: wsEndpoint,
      retryAttempts: 5,
      shouldRetry: () => true,
      connectionParams: () => ({}),
      on: {
        connected: () => console.log('[GraphQL WS] Connected'),
        closed: event => console.log('[GraphQL WS] Closed:', event),
        error: error => console.error('[GraphQL WS] Error:', error),
      },
    })
  }
  return wsClient
}

export function disposeGraphQLWsClient(): void {
  if (wsClient) {
    wsClient.dispose()
    wsClient = null
  }
}
