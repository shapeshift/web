import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

import { foxMidgardPool } from '../test-data/midgardResponse'
import { thorService } from '../thorService'
import { getUsdRate } from './getUsdRate'

jest.mock('../thorService')

describe('getUsdRate', () => {
  const deps = { midgardUrl: 'localhost:3000', adapterManager: <ChainAdapterManager>{} }
  it('should return USD rate of given Thorchain asset', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: foxMidgardPool })
    )

    const rate = await getUsdRate({
      deps,
      input: { assetId }
    })

    expect(rate).toEqual('0.15399605260336216')
  })

  it('should throw if no midgard usd rate is returned', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data: {} }))

    await expect(
      getUsdRate({
        deps,
        input: { assetId }
      })
    ).rejects.toThrow('[getUsdRate]: No rate found')
  })

  it('should throw if no poolAssetId is found for specified assetId', async () => {
    const assetId = 'eip155:1/erc20:0xcfoo'
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data: {} }))

    await expect(
      getUsdRate({
        deps,
        input: { assetId }
      })
    ).rejects.toThrow(`[getUsdRate]: No thorchainPoolId found for assetId: ${assetId}`)
  })
})
