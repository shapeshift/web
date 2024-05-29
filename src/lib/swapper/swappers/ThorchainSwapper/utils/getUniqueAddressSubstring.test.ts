import { describe, expect, it } from 'vitest'

import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'

const FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'

const COLLIDING_FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132i6dF4741'

const BIGGER_COLLIDING_FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b432a6dF4741'
const BIGGER_COLLIDING_FINAL_ASSETID = `eip155:1/erc20:${BIGGER_COLLIDING_FINAL_ASSET_ADDRESS}`

const SHORTENED_FINAL_ASSET_ADDRESS = 'a6df4741'
const FINAL_ASSETID = `eip155:1/erc20:${FINAL_ASSET_ADDRESS}`
const COLLIDING_FINAL_ASSETID = `eip155:1/erc20:${COLLIDING_FINAL_ASSET_ADDRESS}`

const BIGGER_SHORTENED_FINAL_ASSET_ADDRESS = '132a6df4741'

const DEFAULT_THORCHAIN_ASSETS_LIST = [FINAL_ASSETID, COLLIDING_FINAL_ASSETID]
const THORCHAIN_ASSETS_LIST_WITH_BIGGER_COLLISION = [
  FINAL_ASSETID,
  COLLIDING_FINAL_ASSETID,
  BIGGER_COLLIDING_FINAL_ASSETID,
]

describe('getUniqueAddressSubstring', () => {
  it('should get the shorter unique address substring', () => {
    const substring = getUniqueAddressSubstring(FINAL_ASSET_ADDRESS, DEFAULT_THORCHAIN_ASSETS_LIST)

    expect(substring).toBe(SHORTENED_FINAL_ASSET_ADDRESS)
  })

  it('should get the shorter unique address substring with a bigger colliding address', () => {
    const substring = getUniqueAddressSubstring(
      FINAL_ASSET_ADDRESS,
      THORCHAIN_ASSETS_LIST_WITH_BIGGER_COLLISION,
    )

    expect(substring).toBe(BIGGER_SHORTENED_FINAL_ASSET_ADDRESS)
  })
})
