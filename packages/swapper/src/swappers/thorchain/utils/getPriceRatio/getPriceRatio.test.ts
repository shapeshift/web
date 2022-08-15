import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { ThorchainSwapperDeps } from '../../types'
import { ethMidgardPool, foxMidgardPool } from '../test-data/midgardResponse'
import { thorService } from '../thorService'
import { getPriceRatio } from './getPriceRatio'

jest.mock('../thorService')

describe('getPriceRatio', () => {
  const deps: ThorchainSwapperDeps = {
    midgardUrl: 'localhost:3000',
    adapterManager: <ChainAdapterManager>{},
    web3: <Web3>{},
  }

  it('should correctly calculate price ratio of between a given buy and sell asset', async () => {
    const foxId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const ethId = 'eip155:1/slip44:60'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }),
    )

    const ratio = await getPriceRatio(deps, { buyAssetId: foxId, sellAssetId: ethId })

    const expectedRatio = '12749.78930665262978203792'

    expect(ratio).toEqual(expectedRatio)
  })

  it('should throw if  calculating a price for an unknown asset', async () => {
    const derpId = 'eip155:1/erc20:derp'
    const ethId = 'eip155:1/slip44:60'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }),
    )

    await expect(getPriceRatio(deps, { buyAssetId: derpId, sellAssetId: ethId })).rejects.toThrow(
      `[getPriceRatio]: No thorchain pool found`,
    )
  })
})
