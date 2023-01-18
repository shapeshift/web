import type { Asset } from '@shapeshiftoss/asset-service'
import { AssetService } from '@shapeshiftoss/asset-service'
import { btcAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'

import { getThorchainSaversDepositQuote } from './utils'

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
  describe('getThorchainSaversQuote', () => {
    it('gets a quote for a valid pool AssetId', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: btcQuote,
        }),
      )

      const btcAssetMock = getAssetService().getAll()[btcAssetId]
      const saversQuote = await getThorchainSaversDepositQuote(btcAssetMock, '10000000')

      expect(saversQuote).toMatchObject(btcQuote)
    })
    it('throws for an invalid pool AssetId', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: thorchainErrorResponse,
        }),
      )

      const osmoAssetMock = { assetId: osmosisAssetId, precision: 6 } as unknown as Asset
      await expect(getThorchainSaversDepositQuote(osmoAssetMock, '10000000')).rejects.toThrow()
    })
    it('throws when deposit is over the max synth mint supply', async () => {
      mockAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: thorchainErrorResponse,
        }),
      )

      const btcAssetMock = getAssetService().getAll()[btcAssetId]
      await expect(getThorchainSaversDepositQuote(btcAssetMock, '10000000000000')).rejects.toThrow()
    })
  })
})
