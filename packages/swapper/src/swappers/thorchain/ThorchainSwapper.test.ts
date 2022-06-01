import axios from 'axios'

import { ThorchainSwapper } from './ThorchainSwapper'
jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('ThorchainSwapper', () => {
  describe('initialize', () => {
    it('throws when api response', async () => {
      const swapper = new ThorchainSwapper({
        midgardUrl: 'localhost:3000'
      })

      mockedAxios.get.mockImplementation(() => {
        throw new Error('midgard failed')
      })

      await expect(swapper.initialize()).rejects.toThrow(
        '[thorchainInitialize]: initialize failed to set supportedAssetIds'
      )
    })
  })
})
