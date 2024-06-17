import { btcAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'
import { AssetService } from 'lib/asset-service'

import { getMaybeThorchainSaversDepositQuote } from './utils'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('lib/swapper/swappers/ThorchainSwapper/utils/thorService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    thorService: mockAxios.default.create(),
  }
})

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
    default: mockAxios.default.create(),
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

let service: AssetService | undefined = undefined
// do not export this, views get data from selectors
// or directly from the store outside react components
const getAssetService = () => {
  if (!service) {
    service = new AssetService()
  }

  return service
}

describe('resolvers/thorchainSavers/utils', () => {
  describe('getMaybeThorchainSaversDepositQuote', () => {
    it('gets a quote for a valid pool AssetId', async () => {
      mocks.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: btcQuoteResponse,
        }),
      )

      const btcAssetMock = getAssetService().assetsById[btcAssetId]
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

      const btcAssetMock = getAssetService().assetsById[btcAssetId]
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
