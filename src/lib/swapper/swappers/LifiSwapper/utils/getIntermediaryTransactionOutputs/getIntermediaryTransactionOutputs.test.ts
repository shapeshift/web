import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import type { AmountDisplayMeta } from 'lib/swapper/api'

import { getIntermediaryTransactionOutputs } from './getIntermediaryTransactionOutputs'
import { multiStepLifiRouteSteps, singleStepLifiRouteSteps } from './testData'

describe('getIntermediaryTransactionOutputs', () => {
  it('returns correct output for a multi-step route and excludes the final buy and sell amounts', () => {
    const result = getIntermediaryTransactionOutputs(localAssetData, multiStepLifiRouteSteps)

    const usdcOnEthereum: Asset =
      localAssetData['eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48']
    const usdcOnOptimism: Asset =
      localAssetData['eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607']

    // ensure our test data is defined
    expect(usdcOnEthereum).not.toBe(undefined)
    expect(usdcOnOptimism).not.toBe(undefined)

    const expectation: AmountDisplayMeta[] = [
      { asset: usdcOnEthereum, amountCryptoBaseUnit: '120527596' },
      { asset: usdcOnOptimism, amountCryptoBaseUnit: '120328249' },
    ]

    expect(result).toEqual(expectation)
  })

  // possible where lifi is able to bridge without swapping before/after the bridge
  it('returns undefined for route containing only one step since there are no intermediary steps', () => {
    const result = getIntermediaryTransactionOutputs(localAssetData, singleStepLifiRouteSteps)
    expect(result).toBe(undefined)
  })
})
