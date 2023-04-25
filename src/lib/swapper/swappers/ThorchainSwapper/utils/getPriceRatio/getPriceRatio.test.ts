import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import type Web3 from 'web3'

import type { ThorchainSwapperDeps } from '../../types'
import { ethThornodePool, foxThornodePool } from '../test-data/responses'
import { thorService } from '../thorService'
import { getPriceRatio } from './getPriceRatio'

jest.mock('../thorService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    thorService: axios.create(),
  }
})

describe('getPriceRatio', () => {
  const deps: ThorchainSwapperDeps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager: {} as ChainAdapterManager,
    web3: {} as Web3,
  }

  it('should correctly calculate price ratio of between a given buy and sell asset', async () => {
    const foxId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const ethId = 'eip155:1/slip44:60'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(Ok({ data: [foxThornodePool, ethThornodePool] })),
    )

    const ratio = await getPriceRatio(deps, { buyAssetId: foxId, sellAssetId: ethId })

    const expectedRatio = '12749.78930665263109581403'

    expect(ratio.isErr()).toBe(false)
    expect(ratio.unwrap()).toEqual(expectedRatio)
  })

  it('should throw if calculating a price for an unknown asset', async () => {
    const derpId = 'eip155:1/erc20:derp'
    const ethId = 'eip155:1/slip44:60'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(Ok({ data: [foxThornodePool, ethThornodePool] })),
    )

    await expect(getPriceRatio(deps, { buyAssetId: derpId, sellAssetId: ethId })).rejects.toThrow(
      `[getPriceRatio]: No buyPoolId found for asset ${derpId}`,
    )
  })
})
