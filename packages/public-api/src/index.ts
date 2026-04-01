import './setupZod'

import cors from 'cors'
import express from 'express'

import { getAssetsById, initAssets } from './assets'
import { env } from './env'
import { quoteStore } from './lib/quoteStore'
import { resolvePartnerCode } from './middleware/auth'
import {
  affiliateMutationLimiter,
  affiliateStatsLimiter,
  dataLimiter,
  globalLimiter,
  swapQuoteLimiter,
  swapRatesLimiter,
  swapStatusLimiter,
} from './middleware/rateLimit'
import {
  claimPartnerCode,
  createAffiliate,
  getAffiliate,
  getAffiliateStats,
  getAffiliateSwaps,
  updateAffiliate,
} from './routes/affiliate'
import { getAssetById, getAssetCount, getAssets } from './routes/assets'
import { siweNonce, siweVerify } from './routes/auth'
import { getChainCount, getChains } from './routes/chains'
import { getQuote } from './routes/quote'
import { getRates } from './routes/rates'
import { getSwapStatus } from './routes/status'
import { initSwapperDeps } from './swapperDeps'

const startServer = async () => {
  await initAssets()
  initSwapperDeps(getAssetsById())

  const app = express()

  app.set('trust proxy', 1)

  app.use(cors())
  app.use(express.json())
  app.use(globalLimiter)

  app.get('/', (_req, res) => {
    res.redirect('/docs')
  })

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })

  const v1Router = express.Router()

  v1Router.get('/swap/rates', swapRatesLimiter, resolvePartnerCode, getRates)
  v1Router.post('/swap/quote', swapQuoteLimiter, resolvePartnerCode, getQuote)
  v1Router.get('/swap/status', swapStatusLimiter, resolvePartnerCode, getSwapStatus)

  v1Router.get('/affiliate/swaps', dataLimiter, getAffiliateSwaps)
  v1Router.get('/affiliate/stats', affiliateStatsLimiter, getAffiliateStats)
  v1Router.get('/affiliate/:address', dataLimiter, getAffiliate)
  v1Router.post('/affiliate/claim-code', affiliateMutationLimiter, claimPartnerCode)
  v1Router.post('/affiliate', affiliateMutationLimiter, createAffiliate)
  v1Router.patch('/affiliate/:address', affiliateMutationLimiter, updateAffiliate)

  v1Router.post('/auth/siwe/nonce', affiliateMutationLimiter, siweNonce)
  v1Router.post('/auth/siwe/verify', affiliateMutationLimiter, siweVerify)

  v1Router.get('/chains', dataLimiter, getChains)
  v1Router.get('/chains/count', dataLimiter, getChainCount)

  v1Router.get('/assets', dataLimiter, getAssets)
  v1Router.get('/assets/count', dataLimiter, getAssetCount)
  v1Router.get('/assets/:assetId(*)', dataLimiter, getAssetById)

  app.use('/v1', v1Router)

  const { docsRouter } = await import('./routes/docs')
  app.use('/docs', docsRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err)
      res.status(500).json({ error: 'Internal server error' })
    },
  )

  app.listen(env.PORT, () => {
    console.log(`Public API server running on port: ${env.PORT}`)
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
