import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
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
    adapterManager: <ChainAdapterManager>(
      (<unknown>{ get: () => ({ getFeeAssetId: () => ethAssetId }) })
    ),
    web3: <Web3>{}
  }
  it('should correctly estimate a trade fee for bitcoin', async () => {
    const btcDeps = {
      midgardUrl: 'localhost:3000',
      adapterManager: <ChainAdapterManager>(
        (<unknown>{ get: () => ({ getFeeAssetId: () => btcAssetId }) })
      ),
      web3: <Web3>{}
    }
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(btcDeps, BTC)

    const expectedResult = '0.00036'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for ethereum', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )
    const estimatedTradeFee = await estimateTradeFee(deps, ETH)

    const expectedResult = '0.0672'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for an ethereum erc20 asset', async () => {
    ;(thorService.get as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve({ data: mockInboundAdresses }))
      .mockReturnValueOnce(Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }))
    const estimatedTradeFee = await estimateTradeFee(deps, FOX)

    const expectedResult = '856.785841'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should throw if trying to get fee data for an unsupprted asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses })
    )

    return expect(estimateTradeFee(deps, UNSUPPORTED)).rejects.toThrow(
      `[estimateTradeFee] - undefined thorId for given buyAssetId`
    )
  })
})
