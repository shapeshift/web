import { btcAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { getMaybeThorchainSaversDepositQuote } from './utils'

import { getAssetService } from '@/lib/asset-service'

const mocks = vi.hoisted(() => {
  const BTC_ASSET_ID = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
  const BTC_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93'

  return {
    get: vi.fn(),
    post: vi.fn(),
    mockBtcAsset: {
      assetId: BTC_ASSET_ID,
      chainId: BTC_CHAIN_ID,
      symbol: 'BTC',
      name: 'Bitcoin',
      precision: 8,
      color: '#FF9800',
      icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
      explorer: 'https://live.blockcypher.com',
      explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
      explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
      relatedAssetKey: null,
    },
    BTC_ASSET_ID,
  }
})

vi.mock('@/lib/asset-service', () => ({
  getAssetService: () => ({
    assetsById: {
      [mocks.BTC_ASSET_ID]: mocks.mockBtcAsset,
    },
  }),
  initAssetService: vi.fn(),
}))

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

      const assetService = getAssetService()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const btcAssetMock = assetService.assetsById[btcAssetId]!
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

      const assetService = getAssetService()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const btcAssetMock = assetService.assetsById[btcAssetId]!
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
