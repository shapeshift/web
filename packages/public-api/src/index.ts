import './setupZod'

import cors from 'cors'
import express from 'express'

import { initAssets } from './assets'
import { API_HOST, API_PORT } from './config'
import { quoteStore } from './lib/quoteStore'
import { affiliateAddress } from './middleware/auth'
import {
  affiliateStatsLimiter,
  dataLimiter,
  globalLimiter,
  swapQuoteLimiter,
  swapRatesLimiter,
  swapStatusLimiter,
} from './middleware/rateLimit'
import { getAffiliateStats } from './routes/affiliate'
import { getAssetById, getAssetCount, getAssets } from './routes/assets'
import { getChainCount, getChains } from './routes/chains'
import { docsRouter } from './routes/docs'
import { getQuote } from './routes/quote'
import { getRates } from './routes/rates'
import { getSwapStatus } from './routes/status'

const app = express()

app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false)

// Middleware
app.use(cors())
app.use(express.json())
app.use(globalLimiter)

// Root endpoint - API info
app.get('/', (_req, res) => {
  res.json({
    name: 'ShapeShift API',
    version: '1.0.0',
    description: 'Decentralized swap and asset discovery API',
    documentation: '/docs',
    endpoints: {
      health: 'GET /health',
      chains: 'GET /v1/chains',
      chainCount: 'GET /v1/chains/count',
      assets: 'GET /v1/assets',
      assetCount: 'GET /v1/assets/count',
      assetById: 'GET /v1/assets/:assetId',
      swapRates: 'GET /v1/swap/rates',
      swapQuote: 'POST /v1/swap/quote',
      swapStatus: 'GET /v1/swap/status',
      affiliateStats: 'GET /v1/affiliate/stats',
    },
  })
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API v1 routes
const v1Router = express.Router()

// Swap endpoints (optional affiliate address tracking)
v1Router.get('/swap/rates', swapRatesLimiter, affiliateAddress, getRates)
v1Router.post('/swap/quote', swapQuoteLimiter, affiliateAddress, getQuote)
v1Router.get('/swap/status', swapStatusLimiter, affiliateAddress, getSwapStatus)

// Affiliate endpoints
v1Router.get('/affiliate/stats', affiliateStatsLimiter, getAffiliateStats)

// Chain endpoints
v1Router.get('/chains', dataLimiter, getChains)
v1Router.get('/chains/count', dataLimiter, getChainCount)

// Asset endpoints
v1Router.get('/assets', dataLimiter, getAssets)
v1Router.get('/assets/count', dataLimiter, getAssetCount)
v1Router.get('/assets/:assetId(*)', dataLimiter, getAssetById)

app.use('/v1', v1Router)
app.use('/docs', docsRouter)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const startServer = async () => {
  console.log('Initializing assets...')
  await initAssets()

  app.listen(API_PORT, API_HOST, () => {
    console.log(`Public API server running at http://${API_HOST}:${API_PORT}`)
    console.log(`
Available endpoints:
  GET  /health                    - Health check
  GET  /v1/chains                 - List supported chains
  GET  /v1/chains/count           - Get chain count
  GET  /v1/swap/rates             - Get swap rates from all swappers
  POST /v1/swap/quote             - Get executable quote with tx data
  GET  /v1/swap/status            - Get swap status by quoteId
  GET  /v1/affiliate/stats        - Get affiliate stats by address
  GET  /v1/assets                 - List supported assets
  GET  /v1/assets/count           - Get asset count
  GET  /v1/assets/:assetId        - Get single asset by ID

Affiliate Tracking (optional):
  Include 'X-Affiliate-Address' header with your Arbitrum address for affiliate fee attribution.
  The API works without it — no authentication required.
    `)
  })
}

const shutdown = () => {
  console.log('Shutting down gracefully...')
  quoteStore.destroy()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

startServer().catch(console.error)
