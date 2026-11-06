import { getZcashBranchId as getZcashBranchIdEsm } from '@ledgerhq/hw-app-btc/lib-es/createTransaction'
import {
  ZCASH_CONSENSUS_BRANCH_ID,
  ZCASH_UPGRADE_ACTIVATION_HEIGHT,
} from '@shapeshiftoss/hdwallet-core'
import { createRequire } from 'module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  getZcashBranchId: getZcashBranchIdCjs,
} = require('@ledgerhq/hw-app-btc/lib/createTransaction')

const NU6_3_BRANCH_ID = 0x37a5165b

describe.each([
  ['lib', getZcashBranchIdCjs as (blockHeight?: number) => Buffer],
  ['lib-es', getZcashBranchIdEsm as (blockHeight?: number) => Buffer],
])('patched @ledgerhq/hw-app-btc %s getZcashBranchId', (_, getZcashBranchId) => {
  it('selects the previous upgrade branch ID one block before activation', () => {
    expect(getZcashBranchId(ZCASH_UPGRADE_ACTIVATION_HEIGHT - 1).readUInt32LE(0)).toBe(
      NU6_3_BRANCH_ID,
    )
  })

  it('selects the active upgrade branch ID at activation', () => {
    expect(getZcashBranchId(ZCASH_UPGRADE_ACTIVATION_HEIGHT).readUInt32LE(0)).toBe(
      ZCASH_CONSENSUS_BRANCH_ID,
    )
  })

  it('defaults to the active upgrade branch ID without a height', () => {
    expect(getZcashBranchId(undefined).readUInt32LE(0)).toBe(ZCASH_CONSENSUS_BRANCH_ID)
  })
})
