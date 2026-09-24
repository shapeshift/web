import { bscChainId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import longtailTokens from '../../generated/generatedThorLongtailTokens.json'
import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'

const FINAL_ASSET_ASSETID = toAssetId({
  chainId: ethChainId,
  assetReference: '0x8a65ac0E23F31979db06Ec62Af62b432a6dF4741',
  assetNamespace: 'erc20',
})

const COLLIDING_FINAL_ASSETID = toAssetId({
  chainId: ethChainId,
  assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce36dF4741',
  assetNamespace: 'erc20',
})

const BIGGER_COLLIDING_FINAL_ASSETID = toAssetId({
  chainId: ethChainId,
  assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb032a6dF4741',
  assetNamespace: 'erc20',
})

const SAME_ADDRESS_OTHER_CHAIN_ASSETID = toAssetId({
  chainId: bscChainId,
  assetReference: '0x8a65ac0E23F31979db06Ec62Af62b432a6dF4741',
  assetNamespace: 'erc20',
})

const ONE_INCH_ASSETID = toAssetId({
  chainId: ethChainId,
  assetReference: '0x111111111117dc0aa78b770fa6a738034120c302',
  assetNamespace: 'erc20',
})

const SHORTENED_FINAL_ASSET_ADDRESS = 'a6df4741'

const BIGGER_SHORTENED_FINAL_ASSET_ADDRESS = '432a6df4741'

const THORCHAIN_ASSETIDS_ONE_COLLISION = [FINAL_ASSET_ASSETID, COLLIDING_FINAL_ASSETID]
const THORCHAIN_ASSETIDS_TWO_COLLISION = [
  FINAL_ASSET_ASSETID,
  COLLIDING_FINAL_ASSETID,
  BIGGER_COLLIDING_FINAL_ASSETID,
]

describe('getUniqueAddressSubstring', () => {
  it('should get the shorter unique address substring', () => {
    const substring = getUniqueAddressSubstring(
      FINAL_ASSET_ASSETID,
      THORCHAIN_ASSETIDS_ONE_COLLISION,
    )

    expect(substring).toBe(SHORTENED_FINAL_ASSET_ADDRESS)
  })

  it('should get the shorter unique address substring with a bigger colliding address', () => {
    const substring = getUniqueAddressSubstring(
      FINAL_ASSET_ASSETID,
      THORCHAIN_ASSETIDS_TWO_COLLISION,
    )

    expect(substring).toBe(BIGGER_SHORTENED_FINAL_ASSET_ADDRESS)
  })

  it('should ignore the same address on other chains', () => {
    const substring = getUniqueAddressSubstring(FINAL_ASSET_ASSETID, [
      ...THORCHAIN_ASSETIDS_ONE_COLLISION,
      SAME_ADDRESS_OTHER_CHAIN_ASSETID,
    ])

    expect(substring).toBe(SHORTENED_FINAL_ASSET_ADDRESS)
  })

  it('should return the full address when the asset is not in the list', () => {
    const substring = getUniqueAddressSubstring(FINAL_ASSET_ASSETID, [COLLIDING_FINAL_ASSETID])

    expect(substring).toBe('0x8a65ac0e23f31979db06ec62af62b432a6df4741')
  })

  it('should return a hex suffix for an address listed on multiple chains', () => {
    expect(longtailTokens).toContain(ONE_INCH_ASSETID)

    const substring = getUniqueAddressSubstring(ONE_INCH_ASSETID, longtailTokens)

    expect(substring).toMatch(/^[0-9a-f]+$/)
    expect('0x111111111117dc0aa78b770fa6a738034120c302'.endsWith(substring)).toBe(true)
  })
})
