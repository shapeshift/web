import './setupZod'
import express from 'express'
import cors from 'cors'

import { API_PORT, API_HOST } from './config'
import { initAssets } from './assets'
import { apiKeyAuth, optionalApiKeyAuth } from './middleware/auth'
import { getRates } from './routes/rates'
import { getQuote } from './routes/quote'
import { getAssets, getAssetById, getAssetCount } from './routes/assets'
import { docsRouter } from './routes/docs'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API v1 routes
const v1Router = express.Router()

// Swap endpoints (require API key)
v1Router.get('/swap/rates', apiKeyAuth, getRates)
v1Router.post('/swap/quote', apiKeyAuth, getQuote)

// Asset endpoints (optional auth)
v1Router.get('/assets', optionalApiKeyAuth, getAssets)
v1Router.get('/assets/count', optionalApiKeyAuth, getAssetCount)
v1Router.get('/assets/:assetId(*)', optionalApiKeyAuth, getAssetById)

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
  GET  /v1/swap/rates             - Get swap rates from all swappers
  POST /v1/swap/quote             - Get executable quote with tx data
  GET  /v1/assets                 - List supported assets
  GET  /v1/assets/count           - Get asset count
  GET  /v1/assets/:assetId        - Get single asset by ID

Authentication:
  Include 'X-API-Key' header with your API key for /v1/swap/* endpoints.
  Test API key: test-api-key-123
    `)
  })
}

startServer().catch(console.error)
