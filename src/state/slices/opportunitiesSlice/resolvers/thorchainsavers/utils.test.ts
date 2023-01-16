import type { Asset } from '@shapeshiftoss/asset-service'
import { btcAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'

import { getThorchainSaversQuote } from './utils'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

const btcQuote = {
  expected_amount_out: '9997894',
  fees: {
    affiliate: '0',
    asset: 'BTC/BTC',
    outbound: '0',
  },
  inbound_address: 'bc1q0vphqevkhc33g94pl0ctnnp58v9mcuhp4e2hnm',
  inbound_confirmation_blocks: 1,
  memo: '+:BTC/BTC',
  slippage_bps: 2,
}

const thorchainErrorResponse = {
  error: 'Invalid pool',
}

describe('resolvers/thorchainSavers/utils', () => {
  describe('getThorchainSaversQuote', () => {
    it('gets a quote for a valid pool AssetId', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: btcQuote,
        }),
      )

      const btcAssetMock = { assetId: btcAssetId, precision: 8 } as unknown as Asset
      const saversQuote = await getThorchainSaversQuote(btcAssetMock, '10000000')

      expect(saversQuote).toMatchObject(btcQuote)
    })
    it('thros for an invalid pool AssetId', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: thorchainErrorResponse,
        }),
      )

      const osmoAssetMock = { assetId: osmosisAssetId, precision: 6 } as unknown as Asset
      await expect(getThorchainSaversQuote(osmoAssetMock, '10000000')).rejects.toThrow()
    })
    it('throws when deposit is over the max synth mint supply', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: thorchainErrorResponse,
        }),
      )

      const btcAssetMock = { assetId: btcAssetId, precision: 8 } as unknown as Asset
      await expect(getThorchainSaversQuote(btcAssetMock, '10000000000000')).rejects.toThrow()
    })
  })
})
