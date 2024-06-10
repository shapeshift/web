import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

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
})
