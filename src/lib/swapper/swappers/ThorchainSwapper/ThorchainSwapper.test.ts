import { Err } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import { SwapperName } from '../../api'
import { ThorchainSwapper } from './ThorchainSwapper'
import { thorService } from './utils/thorService'

jest.mock('./utils/thorService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    thorService: axios.create(),
  }
})

describe('ThorchainSwapper', () => {
  const swapper = new ThorchainSwapper()

  describe('name', () => {
    it('returns the correct human readable swapper name', () => {
      expect(swapper.name).toEqual(SwapperName.Thorchain)
    })
  })

  describe('initialize', () => {
    it('bubbles up the Err from a errored midgard API response', async () => {
      ;(thorService.get as unknown as jest.Mock<unknown>).mockReturnValue(
        Err({ message: 'midgard failed' }),
      )

      const maybeInitializedSwapper = await swapper.initialize()
      expect(maybeInitializedSwapper.isErr()).toBe(true)
      expect(maybeInitializedSwapper.unwrapErr()).toMatchObject({
        message: 'midgard failed',
      })
    })
  })
})
