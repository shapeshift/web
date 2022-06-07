import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

import { mockInboundAdresses } from '../test-data/midgardResponse'
import { thorService } from '../thorService'
import { estimateTradeFee } from './estimateTradeFee'

jest.mock('../thorService')

describe('estimateTradeFee', () => {
  const deps = { midgardUrl: 'localhost:3000', adapterManager: <ChainAdapterManager>{} }
  it('should correctly estimate a trade fee for bitcoin', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(
      deps,
      'bip122:000000000019d6689c085ae165831e93/slip44:0'
    )

    const expectedResult = '16362'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for ethereum', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(deps, 'eip155:1/slip44:60')

    const expectedResult = '32241720000000000'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for an ethereum erc20 asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(
      deps,
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    )

    const expectedResult = '59636640000000000'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should throw if trying to get fee data for an unsupprted asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )

    return expect(
      estimateTradeFee(deps, 'eip155:1/erc20:0x4204204204204204204204204204204204204204')
    ).rejects.toThrow(`[estimateTradeFee] - undefined thorId for given buyAssetId`)
  })
})
