import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import Web3 from 'web3'

import { SwapperName } from '../../api'
import { ThorchainSwapper } from './ThorchainSwapper'
import { thorService } from './utils/thorService'

jest.mock('./utils/thorService')

const mockedAxios = thorService as jest.Mocked<typeof axios>

describe('ThorchainSwapper', () => {
  const swapper = new ThorchainSwapper({
    midgardUrl: '',
    daemonUrl: '',
    adapterManager: <ChainAdapterManager>{},
    web3: <Web3>{},
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

      await expect(swapper.initialize()).rejects.toThrow(
        '[thorchainInitialize]: initialize failed to set supportedAssetIds',
      )
    })
  })
})
