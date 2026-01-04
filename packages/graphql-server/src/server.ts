import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { makeExecutableSchema } from '@graphql-tools/schema'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { PubSub } from 'graphql-subscriptions'
// eslint-disable-next-line react-hooks/rules-of-hooks -- this is not a React hook
import { useServer } from 'graphql-ws/lib/use/ws'
import { createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

import { initCowSwapService } from './datasources/cowswapService.js'
import { createAccountLoader, createMarketDataLoader, createTxLoader } from './loaders/index.js'
import type { Context } from './resolvers/index.js'
import { resolvers, setSharedPubsub } from './resolvers/index.js'
import { typeDefs } from './schema.js'

export { WebSocket }

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000

const pubsub = new PubSub()
setSharedPubsub(pubsub)
initCowSwapService(pubsub)

const schema = makeExecutableSchema({ typeDefs, resolvers: resolvers as never })

const app = express()
const httpServer = createServer(app)

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
})

// eslint-disable-next-line react-hooks/rules-of-hooks -- this is graphql-ws useServer, not a React hook
const serverCleanup = useServer(
  {
    schema,
    context: () => ({
      pubsub,
      loaders: {
        marketData: createMarketDataLoader(),
        accounts: createAccountLoader(),
        transactions: createTxLoader(),
      },
    }),
    onConnect: () => {
      console.log('[WS] Client connected')
    },
    onDisconnect: () => {
      console.log('[WS] Client disconnected')
    },
  },
  wsServer,
)

const server = new ApolloServer<Context>({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      serverWillStart() {
        return Promise.resolve({
          async drainServer() {
            await serverCleanup.dispose()
          },
        })
      },
    },
  ],
})

async function startServer() {
  await server.start()

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: () =>
        Promise.resolve({
          pubsub,
          loaders: {
            marketData: createMarketDataLoader(),
            accounts: createAccountLoader(),
            transactions: createTxLoader(),
          },
        }),
    }),
  )

  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`)
    console.log(`🔌 WebSocket subscriptions ready at ws://localhost:${PORT}/graphql`)
    console.log(`
Available queries:
  - marketData(assetIds: [String!]!): [MarketData]!
  - accounts(accountIds: [String!]!): [Account]!
  - transactions(accountIds: [String!]!, limit: Int): TransactionConnection!
  - limitOrders(accountIds: [String!]!): [OrdersUpdate!]!
  - health: String!

Subscriptions:
  - limitOrdersUpdated(accountIds: [String!]!): OrdersUpdate!
    `)
  })
}

startServer().catch(console.error)
