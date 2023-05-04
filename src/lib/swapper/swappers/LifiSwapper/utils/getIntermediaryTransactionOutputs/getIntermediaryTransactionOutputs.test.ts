import type { Asset } from '@shapeshiftoss/asset-service'
import { localAssetData } from '@shapeshiftoss/asset-service'
import type { IntermediaryTransactionOutput } from 'lib/swapper/api'

import { getIntermediaryTransactionOutputs } from './getIntermediaryTransactionOutputs'
import { emptyLifiRoute, multiStepLifiRoute, singleStepLifiRoute } from './testData'

jest.mock('state/slices/selectors', () => {
  const { localAssetData } = require('@shapeshiftoss/asset-service') // Move the import inside the factory function

  return {
    selectAssets: () => localAssetData,
  }
})

describe('getIntermediaryTransactionOutputs', () => {
  it('returns correct output for a multi-step route and excludes the final buy and sell amounts', () => {
    const result = getIntermediaryTransactionOutputs(multiStepLifiRoute)

    const usdcOnEthereum: Asset =
      localAssetData['eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48']
    const usdcOnOptimism: Asset =
      localAssetData['eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607']

    // ensure our test data is defined
    expect(usdcOnEthereum).not.toBe(undefined)
    expect(usdcOnOptimism).not.toBe(undefined)

    const expectation: IntermediaryTransactionOutput[] = [
      { asset: usdcOnEthereum, buyAmountCryptoBaseUnit: '120527596' },
      { asset: usdcOnOptimism, buyAmountCryptoBaseUnit: '120328249' },
    ]

    expect(result).toEqual(expectation)
  })

  // should never happen but at minimum we want a sane way to handle it
  it('returns undefined for route with no steps', () => {
    const result = getIntermediaryTransactionOutputs(emptyLifiRoute)
    expect(result).toBe(undefined)
  })

  // possible where lifi is able to bridge without swapping before/after the bridge
  it('returns undefined for route containing only one step since there are no intermediary steps', () => {
    const result = getIntermediaryTransactionOutputs(singleStepLifiRoute)
    expect(result).toBe(undefined)
  })
})
