import { describe, expect, it } from 'vitest'

import type { Asset, AssetsListResponse } from './routes/assets/types'
import type { ChainsListResponse } from './routes/chains/types'
import type { QuoteResponse } from './routes/quote/types'
import { QuoteResponseSchema } from './routes/quote/types'
import type { RateResponse } from './routes/rates/types'
import { RateResponseSchema } from './routes/rates/types'

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? '3001'}`

const VULTISIG_PARTNER_CODE = 'vultisig'

const ASSET_IDS = {
  ETH: 'eip155:1/slip44:60',
  USDC_ETH: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  BTC: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  HYPEREVM: 'eip155:999/slip44:60',
  KATANA: 'eip155:747474/slip44:60',
  MEGAETH: 'eip155:4326/slip44:60',
  MONAD: 'eip155:143/slip44:60',
  PLASMA: 'eip155:9745/slip44:60',
  ZEC: 'bip122:00040fe8ec8471911baa1db1266ea15d/slip44:133',
  ATOM: 'cosmos:cosmoshub-4/slip44:118',
  RUNE: 'cosmos:thorchain-1/slip44:931',
  CACAO: 'cosmos:mayachain-mainnet-v1/slip44:931',
  SOL: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  TRX: 'tron:0x2b6653dc/slip44:195',
  SUI: 'sui:35834a8a/slip44:784',
  TON: 'ton:mainnet/slip44:607',
  NEAR: 'near:mainnet/slip44:397',
  STRK: 'starknet:SN_MAIN/slip44:9004',
} as const

const ADDRESS = {
  evm: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  btc: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  zec: 't1Tcr8tigNAFvjm7tZ2Hq4bkFmsQzhuhUfd',
  maya: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37nu75fmz',
  sol: 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ',
  tron: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  sui: '0x0000000000000000000000000000000000000000000000000000000000000001',
  ton: 'EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI',
  near: 'kevin.near',
  starknet: '0x0000000000000000000000000000000000000000000000000000000000000001',
} as const

const RATES: { label: string; sellAssetId: string; buyAssetId: string; amount: string }[] = [
  {
    label: 'HyperEVM Chain',
    sellAssetId: ASSET_IDS.HYPEREVM,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000000000000',
  },
  {
    label: 'Katana Chain',
    sellAssetId: ASSET_IDS.KATANA,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000000000000',
  },
  {
    label: 'MegaETH Chain',
    sellAssetId: ASSET_IDS.MEGAETH,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000000000000',
  },
  {
    label: 'Monad Chain',
    sellAssetId: ASSET_IDS.MONAD,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000000000000',
  },
  {
    label: 'Plasma Chain',
    sellAssetId: ASSET_IDS.PLASMA,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000000000000',
  },
  {
    label: 'Zcash Chain',
    sellAssetId: ASSET_IDS.ZEC,
    buyAssetId: ASSET_IDS.BTC,
    amount: '100000000',
  },
  {
    label: 'Cosmos Chain',
    sellAssetId: ASSET_IDS.ATOM,
    buyAssetId: ASSET_IDS.BTC,
    amount: '10000000',
  },
  {
    label: 'THORChain Chain',
    sellAssetId: ASSET_IDS.RUNE,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000',
  },
  {
    label: 'Mayachain Chain',
    sellAssetId: ASSET_IDS.CACAO,
    buyAssetId: ASSET_IDS.BTC,
    amount: '1000000000000',
  },
  {
    label: 'Solana Chain',
    sellAssetId: ASSET_IDS.SOL,
    buyAssetId: ASSET_IDS.BTC,
    amount: '1000000000',
  },
  {
    label: 'Tron Chain',
    sellAssetId: ASSET_IDS.TRX,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '1000000000',
  },
  {
    label: 'Sui Chain',
    sellAssetId: ASSET_IDS.SUI,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '5000000000',
  },
  {
    label: 'TON Chain',
    sellAssetId: ASSET_IDS.TON,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '5000000000',
  },
  {
    label: 'NEAR Chain',
    sellAssetId: ASSET_IDS.NEAR,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '5000000000000000000000000',
  },
  {
    label: 'Starknet Chain',
    sellAssetId: ASSET_IDS.STRK,
    buyAssetId: ASSET_IDS.USDC_ETH,
    amount: '50000000000000000000',
  },
]

const QUOTES: {
  label: string
  sellAssetId: string
  buyAssetId: string
  swapperName: string
  sendAddress: string
  receiveAddress: string
  amount: string
}[] = [
  {
    label: 'Second-Class EVM Adapter (HyperEVM)',
    sellAssetId: ASSET_IDS.HYPEREVM,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'Relay',
    sendAddress: ADDRESS.evm,
    receiveAddress: ADDRESS.evm,
    amount: '1000000000000000000',
  },
  {
    label: 'UTXO Adapter (Zcash)',
    sellAssetId: ASSET_IDS.ZEC,
    buyAssetId: ASSET_IDS.BTC,
    swapperName: 'MAYAChain',
    sendAddress: ADDRESS.zec,
    receiveAddress: ADDRESS.btc,
    amount: '100000000',
  },
  {
    label: 'CosmosSDK Adapter (Mayachain)',
    sellAssetId: ASSET_IDS.CACAO,
    buyAssetId: ASSET_IDS.BTC,
    swapperName: 'MAYAChain',
    sendAddress: ADDRESS.maya,
    receiveAddress: ADDRESS.btc,
    amount: '1000000000000',
  },
  {
    label: 'Solana Adapter',
    sellAssetId: ASSET_IDS.SOL,
    buyAssetId: ASSET_IDS.BTC,
    swapperName: 'Chainflip',
    sendAddress: ADDRESS.sol,
    receiveAddress: ADDRESS.btc,
    amount: '1000000000',
  },
  {
    label: 'Tron Adapter',
    sellAssetId: ASSET_IDS.TRX,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'NEAR Intents',
    sendAddress: ADDRESS.tron,
    receiveAddress: ADDRESS.evm,
    amount: '1000000000',
  },
  {
    label: 'Sui Adapter',
    sellAssetId: ASSET_IDS.SUI,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'NEAR Intents',
    sendAddress: ADDRESS.sui,
    receiveAddress: ADDRESS.evm,
    amount: '5000000000',
  },
  {
    label: 'TON Adapter',
    sellAssetId: ASSET_IDS.TON,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'NEAR Intents',
    sendAddress: ADDRESS.ton,
    receiveAddress: ADDRESS.evm,
    amount: '5000000000',
  },
  {
    label: 'NEAR Adapter',
    sellAssetId: ASSET_IDS.NEAR,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'NEAR Intents',
    sendAddress: ADDRESS.near,
    receiveAddress: ADDRESS.evm,
    amount: '5000000000000000000000000',
  },
  {
    label: 'Starknet Adapter',
    sellAssetId: ASSET_IDS.STRK,
    buyAssetId: ASSET_IDS.USDC_ETH,
    swapperName: 'NEAR Intents',
    sendAddress: ADDRESS.starknet,
    receiveAddress: ADDRESS.evm,
    amount: '50000000000000000000',
  },
]

const TEST_PAIRS = {
  evmSameChain: {
    sellAssetId: ASSET_IDS.ETH,
    buyAssetId: ASSET_IDS.USDC_ETH,
    sellAmountCryptoBaseUnit: '100000000000000000',
  },
  crossChain: {
    sellAssetId: ASSET_IDS.ETH,
    buyAssetId: ASSET_IDS.BTC,
    sellAmountCryptoBaseUnit: '100000000000000000',
  },
}

describe('health', () => {
  it('returns ok', async () => {
    const res = await fetch(`${API_URL}/health`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as { status: string }
    expect(data.status).toBe('ok')
  })
})

describe('/v1/chains', () => {
  it('returns a non-empty list of chains', async () => {
    const res = await fetch(`${API_URL}/v1/chains`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as ChainsListResponse
    expect(Array.isArray(data.chains)).toBe(true)
    expect(data.chains.length).toBeGreaterThan(0)
    const [first] = data.chains
    expect(first).toMatchObject({ chainId: expect.any(String), name: expect.any(String) })
  })
})

describe('/v1/assets', () => {
  it('returns a non-empty list of assets', async () => {
    const res = await fetch(`${API_URL}/v1/assets?limit=10`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as AssetsListResponse
    expect(Array.isArray(data.assets)).toBe(true)
    expect(data.assets.length).toBeGreaterThan(0)
  })

  it('returns a single asset by id', async () => {
    const res = await fetch(`${API_URL}/v1/assets/${encodeURIComponent(ASSET_IDS.ETH)}`)
    expect(res.ok).toBe(true)
    const asset = (await res.json()) as Asset
    expect(asset).toMatchObject({ chainId: expect.any(String), symbol: expect.any(String) })
  })
})

describe('/v1/swap/rates', () => {
  it('does not require authentication', { retry: 2 }, async () => {
    const params = new URLSearchParams({
      sellAssetId: ASSET_IDS.ETH,
      buyAssetId: ASSET_IDS.USDC_ETH,
      sellAmountCryptoBaseUnit: '100000000000000000',
    })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`)
    expect(res.status).not.toBe(401)
  })

  it('returns rates for an EVM same-chain pair', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    expect(Array.isArray(data.rates)).toBe(true)
    const validRates = data.rates.filter(
      r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
    )
    expect(validRates.length).toBeGreaterThan(0)
  })

  it('returns rates for a cross-chain pair', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.crossChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    expect(Array.isArray(data.rates)).toBe(true)
    const validRates = data.rates.filter(
      r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
    )
    expect(validRates.length).toBeGreaterThan(0)
  })

  it('uses default affiliate bps when no partner code is provided', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    const [first] = data.rates
    expect(first.affiliateBps).toBe('60')
  })

  it('uses resolved affiliate bps when a valid partner code is provided', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    const [first] = data.rates
    expect(typeof first.affiliateBps).toBe('string')
    expect(Number(first.affiliateBps)).toBeGreaterThan(0)
  })

  it.each(RATES)(
    'returns a rate for $label',
    { timeout: 30_000, retry: 2 },
    async ({ sellAssetId, buyAssetId, amount }) => {
      const params = new URLSearchParams({
        sellAssetId,
        buyAssetId,
        sellAmountCryptoBaseUnit: amount,
      })
      const res = await fetch(`${API_URL}/v1/swap/rates?${params}`)
      expect(res.ok).toBe(true)
      const data = (await res.json()) as RateResponse
      const parsed = RateResponseSchema.safeParse(data)
      expect(parsed.success ? [] : parsed.error.issues).toEqual([])
      const validRates = data.rates.filter(
        r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
      )
      expect(validRates.length).toBeGreaterThan(0)
    },
  )
})

describe('/v1/swap/quote', () => {
  it('does not require authentication', { retry: 2 }, async () => {
    const res = await fetch(`${API_URL}/v1/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellAssetId: ASSET_IDS.ETH,
        buyAssetId: ASSET_IDS.USDC_ETH,
        sellAmountCryptoBaseUnit: '100000000000000000',
        sendAddress: ADDRESS.evm,
        receiveAddress: ADDRESS.evm,
        swapperName: '0x',
      }),
    })
    expect(res.status).not.toBe(401)
    const data = (await res.json()) as QuoteResponse
    expect(data).toMatchObject({ quoteId: expect.any(String), swapperName: expect.any(String) })
  })

  it.each(QUOTES)(
    'returns a quote $label via $swapperName',
    { timeout: 30_000, retry: 2 },
    async ({ sellAssetId, buyAssetId, swapperName, sendAddress, receiveAddress, amount }) => {
      const res = await fetch(`${API_URL}/v1/swap/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellAssetId,
          buyAssetId,
          sellAmountCryptoBaseUnit: amount,
          sendAddress,
          receiveAddress,
          swapperName,
        }),
      })
      const data = (await res.json()) as QuoteResponse & { error?: unknown }
      expect(res.ok).toBe(true)
      expect(data.quoteId).toEqual(expect.any(String))
      const parsed = QuoteResponseSchema.safeParse(data)
      expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    },
  )
})
