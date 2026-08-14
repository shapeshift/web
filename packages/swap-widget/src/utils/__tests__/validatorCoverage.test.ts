import { describe, expect, it } from 'vitest'

import {
  COSMOS_CHAIN_IDS,
  EVM_CHAIN_IDS,
  OTHER_CHAIN_IDS,
  REDIRECT_ONLY_CHAIN_IDS,
  UTXO_CHAIN_IDS,
} from '../../types'
import { getAddressFormatHint, validateAddress } from '../addressValidation'

// Every selectable chain must be able to reject a bad address with a chain-specific error, or the
// deposit flow dead-ends: it takes precedence over the redirect, so there is no fallback path
describe('validator coverage', () => {
  const allChainIds = [
    ...Object.values(EVM_CHAIN_IDS),
    ...Object.values(UTXO_CHAIN_IDS),
    ...Object.values(COSMOS_CHAIN_IDS),
    ...Object.values(OTHER_CHAIN_IDS),
    ...Object.values(REDIRECT_ONLY_CHAIN_IDS),
  ]

  it.each(allChainIds)('%s has a validator', chainId => {
    const { error } = validateAddress('definitely-not-an-address', chainId)
    expect(error).not.toBe('Unsupported chain type')
    expect(error).not.toBe('Unsupported UTXO chain')
    expect(error).not.toBe('Unsupported CosmosSdk chain')
  })

  it.each(allChainIds)('%s has a format hint', chainId => {
    expect(getAddressFormatHint(chainId)).not.toBe('Enter address')
  })
})
