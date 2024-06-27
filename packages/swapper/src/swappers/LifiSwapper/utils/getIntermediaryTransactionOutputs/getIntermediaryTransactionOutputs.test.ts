import { describe, expect, it } from 'vitest'

import type { AmountDisplayMeta } from '../../../../types'
import { USDC_ARBITRUM, USDC_MAINNET } from '../../../utils/test-data/assets'
import { getIntermediaryTransactionOutputs } from './getIntermediaryTransactionOutputs'
import { multiStepLifiRouteSteps, singleStepLifiRouteSteps } from './testData'

describe('getIntermediaryTransactionOutputs', () => {
  const assets = {
    [USDC_MAINNET.assetId]: USDC_MAINNET,
    [USDC_ARBITRUM.assetId]: USDC_ARBITRUM,
  }

  it('returns correct output for a multi-step route and excludes the final buy and sell amounts', () => {
    const result = getIntermediaryTransactionOutputs(assets, multiStepLifiRouteSteps)

    const expectation: AmountDisplayMeta[] = [
      { asset: USDC_MAINNET, amountCryptoBaseUnit: '120527596' },
      { asset: USDC_ARBITRUM, amountCryptoBaseUnit: '12032824∂9' },
    ]

    expect(result).toEqual(expectation)
  })

  // possible where lifi is able to bridge without swapping before/after the bridge
  it('returns undefined for route containing only one step since there are no intermediary steps', () => {
    const result = getIntermediaryTransactionOutputs(assets, singleStepLifiRouteSteps)
    expect(result).toBe(undefined)
  })
})
