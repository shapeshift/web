import { btcAssetId, btcChainId, ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, UNSUPPORTED } from '../../../utils/test-data/assets'
import { ethMidgardPool, foxMidgardPool, mockInboundAdresses } from '../test-data/midgardResponse'
import { thorService } from '../thorService'
import { estimateTradeFee } from './estimateTradeFee'

jest.mock('../thorService')

describe('estimateTradeFee', () => {
  const deps = {
    midgardUrl: 'localhost:3000',
    adapterManager: new Map([
      [ethChainId, { getFeeAssetId: () => ethAssetId }],
      [btcChainId, { getFeeAssetId: () => btcAssetId }]
    ]) as ChainAdapterManager,
    web3: <Web3>{}
  }
  it('should correctly estimate a trade fee for bitcoin as buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(deps, BTC)

    const expectedResult = '0.00036'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for ethereum as buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(deps, ETH)

    const expectedResult = '0.0672'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for an ethereum erc20 asset as a buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve({ data: mockInboundAdresses }))
      .mockReturnValueOnce(Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }))
    const estimatedTradeFee = await estimateTradeFee(deps, FOX)

    const expectedResult = '856.785841'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should throw if trying to get fee data for an unsupported buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )

    return expect(estimateTradeFee(deps, UNSUPPORTED)).rejects.toThrow(
      `[estimateTradeFee] - undefined thorId for given buyAssetId`
    )
  })
})
