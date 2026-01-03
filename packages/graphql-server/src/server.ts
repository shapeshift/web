import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import { createAccountLoader, createMarketDataLoader, createTxLoader } from './loaders/index.js'
import type { Context } from './resolvers/index.js'
import { resolvers } from './resolvers/index.js'
import { typeDefs } from './schema.js'

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
})

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000

startStandaloneServer(server, {
  listen: { port: PORT },
  context: () =>
    Promise.resolve({
      // Create new DataLoader instances for each request
      // This ensures proper batching within a single request
      // and prevents data leakage between requests
      loaders: {
        marketData: createMarketDataLoader(),
        accounts: createAccountLoader(),
        transactions: createTxLoader(),
      },
    }),
}).then(({ url }) => {
  console.log(`🚀 GraphQL server ready at ${url}`)
  console.log(`
Available queries:
  - marketData(assetIds: [String!]!): [MarketData]!
  - accounts(accountIds: [String!]!): [Account]!
  - transactions(accountIds: [String!]!, limit: Int, cursor: String): TransactionConnection!
  - health: String!
  `)
})
