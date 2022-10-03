import { btcAssetId, btcChainId, ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, UNSUPPORTED } from '../../../utils/test-data/assets'
import { ethThornodePool, foxThornodePool, mockInboundAdresses } from '../test-data/responses'
import { thorService } from '../thorService'
import { estimateBuyAssetTradeFeeCrypto } from './estimateBuyAssetTradeFeeCrypto'

jest.mock('../thorService')

describe('estimateBuyAssetTradeFeeCrypto', () => {
  const deps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager: new Map([
      [ethChainId, { getFeeAssetId: () => ethAssetId }],
      [btcChainId, { getFeeAssetId: () => btcAssetId }],
    ]) as ChainAdapterManager,
    web3: <Web3>{},
  }
  it('should correctly estimate a trade fee for bitcoin as buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses }),
    )
    const estimatedTradeFee = await estimateBuyAssetTradeFeeCrypto(deps, BTC)

    const expectedResult = '0.00036'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for ethereum as buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses }),
    )
    const estimatedTradeFee = await estimateBuyAssetTradeFeeCrypto(deps, ETH)

    const expectedResult = '0.0672'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should correctly estimate a trade fee for an ethereum erc20 asset as a buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve({ data: mockInboundAdresses }))
      .mockReturnValueOnce(Promise.resolve({ data: [foxThornodePool, ethThornodePool] }))
    const estimatedTradeFee = await estimateBuyAssetTradeFeeCrypto(deps, FOX)

    const expectedResult = '0.000005270675333037553824'
    expect(estimatedTradeFee).toEqual(expectedResult)
  })
  it('should throw if trying to get fee data for an unsupported buy asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: mockInboundAdresses }),
    )

    return expect(estimateBuyAssetTradeFeeCrypto(deps, UNSUPPORTED)).rejects.toThrow(
      `[estimateBuyAssetTradeFeeCrypto] - undefined thorId for given buyAssetId`,
    )
  })
})
