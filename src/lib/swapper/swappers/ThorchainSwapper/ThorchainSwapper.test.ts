import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import type axios from 'axios'
import type Web3 from 'web3'

import { SwapperName } from '../../api'
import { ThorchainSwapper } from './ThorchainSwapper'
import { thorService } from './utils/thorService'

jest.mock('./utils/thorService')

const mockedAxios = thorService as jest.Mocked<typeof axios>

describe('ThorchainSwapper', () => {
  const swapper = new ThorchainSwapper({
    midgardUrl: '',
    daemonUrl: '',
    adapterManager: {} as ChainAdapterManager,
    web3: {} as Web3,
  })

  describe('name', () => {
    it('returns the correct human readable swapper name', () => {
      expect(swapper.name).toEqual(SwapperName.Thorchain)
    })
  })

  describe('initialize', () => {
    it('throws when api response', async () => {
      mockedAxios.get.mockImplementation(() => {
        throw new Error('midgard failed')
      })

      const maybeInitializedSwapper = await swapper.initialize()
      expect(maybeInitializedSwapper.isErr()).toBe(true)
      expect(maybeInitializedSwapper.unwrapErr()).toMatchObject({
        cause: 'midgard failed',
        code: 'INITIALIZE_FAILED',
        details: undefined,
        message: '[thorchainInitialize]: initialize failed to set supportedAssetIds',
        name: 'SwapError',
      })
    })
  })
})
