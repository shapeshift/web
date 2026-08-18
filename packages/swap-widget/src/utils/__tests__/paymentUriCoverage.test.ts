import { buildPaymentUri } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import {
  COSMOS_CHAIN_IDS,
  EVM_CHAIN_IDS,
  OTHER_CHAIN_IDS,
  REDIRECT_ONLY_CHAIN_IDS,
  UTXO_CHAIN_IDS,
} from '../../types'

const ADDRESS = 'ADDRESS'

const uriFor = (chainId: string) =>
  buildPaymentUri({
    address: ADDRESS,
    asset: { assetId: `${chainId}/slip44:0`, chainId, precision: 8 },
    amountCryptoPrecision: '1.5',
  })

// Chains with no adopted scheme deliberately fall back to the bare address: an unrecognised scheme
// can stop a wallet scanning at all, which is worse than making the user type the amount
const NO_ADOPTED_SCHEME = [
  REDIRECT_ONLY_CHAIN_IDS.tron,
  REDIRECT_ONLY_CHAIN_IDS.sui,
  REDIRECT_ONLY_CHAIN_IDS.near,
  REDIRECT_ONLY_CHAIN_IDS.starknet,
]

describe('payment uri coverage', () => {
  const carriesAmount = [
    ...Object.values(EVM_CHAIN_IDS),
    ...Object.values(UTXO_CHAIN_IDS),
    ...Object.values(COSMOS_CHAIN_IDS),
    ...Object.values(OTHER_CHAIN_IDS),
    REDIRECT_ONLY_CHAIN_IDS.zcash,
    REDIRECT_ONLY_CHAIN_IDS.ton,
  ]

  it.each(carriesAmount)('%s encodes the amount', chainId => {
    const uri = uriFor(chainId)
    expect(uri).not.toBe(ADDRESS)
    expect(uri).toMatch(/amount=|value=/)
  })

  it.each(NO_ADOPTED_SCHEME)('%s falls back to the bare address', chainId => {
    expect(uriFor(chainId)).toBe(ADDRESS)
  })

  it('uses the ton deep link with nanocoins', () => {
    expect(
      buildPaymentUri({
        address: 'UQtest',
        asset: {
          assetId: `${REDIRECT_ONLY_CHAIN_IDS.ton}/slip44:607`,
          chainId: REDIRECT_ONLY_CHAIN_IDS.ton,
          precision: 9,
        },
        amountCryptoPrecision: '1.5',
      }),
    ).toBe('ton://transfer/UQtest?amount=1500000000')
  })

  it('uses zip-321 for zcash', () => {
    expect(uriFor(REDIRECT_ONLY_CHAIN_IDS.zcash)).toBe(`zcash:${ADDRESS}?amount=1.5`)
  })
})
