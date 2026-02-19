/**
 * Standalone test server for the Public Swap API
 * This version uses mocked responses to demonstrate the API structure
 * without requiring full swapper package integration.
 *
 * For production, use index.ts which integrates with the real swapper package.
 */

import cors from 'cors'
import express from 'express'
import { v4 as uuidv4 } from 'uuid'

const API_PORT = parseInt(process.env.PORT || '3001', 10)
const API_HOST = process.env.HOST || '0.0.0.0'

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

const affiliateAddress = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const address = req.header('X-Affiliate-Address')

  if (!address) {
    return next()
  }

  if (!EVM_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({
      error:
        'Invalid affiliate address format. Must be a valid EVM address (0x followed by 40 hex characters).',
      code: 'INVALID_AFFILIATE_ADDRESS',
    })
  }

  ;(req as any).affiliateInfo = { affiliateAddress: address }

  next()
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Mock rates endpoint
app.get('/v1/swap/rates', affiliateAddress, (req, res) => {
  const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = req.query

  if (!sellAssetId || !buyAssetId || !sellAmountCryptoBaseUnit) {
    return res.status(400).json({
      error: 'Missing required parameters: sellAssetId, buyAssetId, sellAmountCryptoBaseUnit',
    })
  }

  // Mock response demonstrating API structure
  const mockRates = [
    {
      swapperName: 'THORChain',
      rate: '3500.123456',
      buyAmountCryptoBaseUnit: '3500123456',
      sellAmountCryptoBaseUnit: sellAmountCryptoBaseUnit as string,
      steps: 1,
      estimatedExecutionTimeMs: 600000,
      priceImpactPercentageDecimal: '0.001',
      affiliateBps: '60',
      networkFeeCryptoBaseUnit: '5000000000000000',
    },
    {
      swapperName: '0x',
      rate: '3498.789012',
      buyAmountCryptoBaseUnit: '3498789012',
      sellAmountCryptoBaseUnit: sellAmountCryptoBaseUnit as string,
      steps: 1,
      estimatedExecutionTimeMs: 30000,
      priceImpactPercentageDecimal: '0.002',
      affiliateBps: '60',
      networkFeeCryptoBaseUnit: '3000000000000000',
    },
    {
      swapperName: 'CoW Swap',
      rate: '3499.567890',
      buyAmountCryptoBaseUnit: '3499567890',
      sellAmountCryptoBaseUnit: sellAmountCryptoBaseUnit as string,
      steps: 1,
      estimatedExecutionTimeMs: 120000,
      priceImpactPercentageDecimal: '0.0015',
      affiliateBps: '60',
      networkFeeCryptoBaseUnit: '2000000000000000',
    },
  ]

  const now = Date.now()
  res.json({
    rates: mockRates,
    timestamp: now,
    expiresAt: now + 30000,
  })
})

// Mock quote endpoint
app.post('/v1/swap/quote', affiliateAddress, (req, res) => {
  const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit, receiveAddress, swapperName } =
    req.body

  if (!sellAssetId || !buyAssetId || !sellAmountCryptoBaseUnit || !receiveAddress || !swapperName) {
    return res.status(400).json({
      error: 'Missing required parameters',
    })
  }

  const quoteId = uuidv4()
  const now = Date.now()

  // Mock response with transaction data
  res.json({
    quoteId,
    swapperName,
    rate: '3500.123456',
    sellAsset: {
      assetId: sellAssetId,
      chainId: 'eip155:1',
      symbol: 'ETH',
      name: 'Ethereum',
      precision: 18,
    },
    buyAsset: {
      assetId: buyAssetId,
      chainId: 'eip155:1',
      symbol: 'USDC',
      name: 'USD Coin',
      precision: 6,
    },
    sellAmountCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit: '3505000000',
    buyAmountAfterFeesCryptoBaseUnit: '3500000000',
    affiliateBps: '60',
    slippageTolerancePercentageDecimal: '0.01',
    networkFeeCryptoBaseUnit: '5000000000000000',
    steps: [
      {
        sellAsset: { assetId: sellAssetId, symbol: 'ETH', precision: 18 },
        buyAsset: { assetId: buyAssetId, symbol: 'USDC', precision: 6 },
        sellAmountCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit: '3500000000',
        allowanceContract: '0x0000000000000000000000000000000000000000',
        estimatedExecutionTimeMs: 600000,
        source: swapperName,
        transactionData: {
          to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
          data: '0x12aa3caf000000000000000000000000...', // Truncated for example
          value: sellAmountCryptoBaseUnit,
          gasLimit: '250000',
        },
      },
    ],
    approval: {
      isRequired: false,
      spender: '0x0000000000000000000000000000000000000000',
    },
    expiresAt: now + 60000,
  })
})

// Mock assets endpoint
app.get('/v1/assets', (_req, res) => {
  res.json({
    assets: [
      {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
        name: 'Ethereum',
        precision: 18,
      },
      {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        precision: 6,
      },
      {
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
        name: 'Bitcoin',
        precision: 8,
      },
    ],
    timestamp: Date.now(),
  })
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(API_PORT, API_HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    ShapeShift Public Swap API                    ║
║                      (Mock/Test Server)                          ║
╚══════════════════════════════════════════════════════════════════╝

Server running at http://${API_HOST}:${API_PORT}

Endpoints:
  GET  /health                  - Health check (no auth)
  GET  /v1/swap/rates           - Get swap rates from all swappers
  POST /v1/swap/quote           - Get executable quote with tx data
  GET  /v1/assets               - List supported assets

Affiliate Tracking (optional):
  Include 'X-Affiliate-Address' header with your Arbitrum address for fee attribution.
  The API works without it — no authentication required.

Example requests:

  # Health check
  curl http://localhost:${API_PORT}/health

  # Get rates (with affiliate address)
  curl -H "X-Affiliate-Address: 0x0000000000000000000000000000000000000001" \\
    "http://localhost:${API_PORT}/v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000"

  # Get quote (with affiliate address)
  curl -X POST -H "X-Affiliate-Address: 0x0000000000000000000000000000000000000001" -H "Content-Type: application/json" \\
    -d '{"sellAssetId":"eip155:1/slip44:60","buyAssetId":"eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","sellAmountCryptoBaseUnit":"1000000000000000000","receiveAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f4EdC3","swapperName":"THORChain"}' \\
    http://localhost:${API_PORT}/v1/swap/quote

Note: This is a mock server for testing. Real integration uses index.ts.
`)
})
