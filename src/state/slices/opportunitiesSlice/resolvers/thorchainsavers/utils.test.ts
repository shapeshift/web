import { btcAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { getMaybeThorchainSaversDepositQuote } from './utils'

import { getAssetService } from '@/lib/asset-service'
import { bitcoin as btcAsset } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.stubGlobal(
  'fetch',
  vi.fn((url: string) => {
    if (url.includes('encodedAssetData.json')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            byId: {
              [btcAssetId]: btcAsset,
            },
            ids: [btcAssetId],
          }),
      } as Response)
    }
    if (url.includes('encodedRelatedAssetIndex.json')) {
      return Promise.resolve({
        json: () => Promise.resolve({}),
      } as Response)
    }
    return Promise.reject(new Error('Not found'))
  }),
)

vi.mock('axios', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    default: {
      ...mockAxios.default.create(),
      create: mockAxios.default.create,
    },
  }
})

vi.mock('axios-cache-interceptor', () => {
  return {
    setupCache: vi.fn(axios => axios),
    buildMemoryStorage: vi.fn(),
  }
})

const btcQuoteResponse = {
  expected_amount_out: '9997894',
  fees: {
    affiliate: '0',
    asset: 'BTC/BTC',
    slippage_bps: 2,
    outbound: '0',
  },
  inbound_address: 'bc1q0vphqevkhc33g94pl0ctnnp58v9mcuhp4e2hnm',
  inbound_confirmation_blocks: 1,
  memo: '+:BTC/BTC',
}

const thorchainSaversDepositQuote = Object.assign({}, btcQuoteResponse, { memo: '+:BTC/BTC' })

const thorchainErrorResponse = {
  error: 'Invalid pool',
}

describe('resolvers/thorchainSavers/utils', () => {
  describe('getMaybeThorchainSaversDepositQuote', () => {
    it('gets a quote for a valid pool AssetId', async () => {
      mocks.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            expected_amount_out: '9997894',
            fees: {
              affiliate: '0',
              asset: 'BTC/BTC',
              slippage_bps: 2,
              outbound: '0',
            },
            inbound_address: 'bc1q0vphqevkhc33g94pl0ctnnp58v9mcuhp4e2hnm',
            inbound_confirmation_blocks: 1,
            memo: '+:BTC/BTC',
          },
        }),
      )

      const assetService = await getAssetService()
      const btcAssetMock = assetService.assetsById[btcAssetId]
      const maybeSaversQuote = await getMaybeThorchainSaversDepositQuote({
        asset: btcAssetMock,
        amountCryptoBaseUnit: '10000000',
      })

      expect(maybeSaversQuote.isErr()).toBe(false)
      const saversQuote = maybeSaversQuote.unwrap()

      expect(saversQuote).toMatchObject(thorchainSaversDepositQuote)
    })
    it('return an Err when deposit is over the max synth mint supply', async () => {
      mocks.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: thorchainErrorResponse,
        }),
      )

      const assetService = await getAssetService()
      const btcAssetMock = assetService.assetsById[btcAssetId]
      expect(
        (
          await getMaybeThorchainSaversDepositQuote({
            asset: btcAssetMock,
            amountCryptoBaseUnit: '10000000000000',
          })
        ).isErr(),
      ).toBe(true)
    })
  })
})
