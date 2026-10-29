import * as core from '@shapeshiftoss/hdwallet-core'
import { beforeAll, describe, expect, it } from 'vitest'

import * as native from './native'

const MNEMONIC = 'all all all all all all all all all all all all'

// addresses from @aptos-labs/ts-sdk Account.fromDerivationPath at m/44'/637'/<account>'/0'/0'
const SDK_ADDRESSES = [
  '0xdb3d33094a6d31436739ef679c379c793a5656a25cf997c929b667244051a6b9',
  '0x6ee995262e7dd5e28ade07309607f34bc542e667d6cc3c97277a33249a9c91b3',
]

describe('NativeAptosWallet', () => {
  let wallet: native.NativeHDWallet

  beforeAll(async () => {
    wallet = native.create({ deviceId: 'native' })
    await wallet.loadDevice({ mnemonic: MNEMONIC })
  })

  it.each(SDK_ADDRESSES.map((address, accountIdx) => [accountIdx, address]))(
    'derives the petra/sdk address for account %i',
    async (accountIdx, address) => {
      const [{ addressNList }] = core.aptosGetAccountPaths({ accountIdx })
      await expect(wallet.aptosGetAddress({ addressNList })).resolves.toBe(address)
    },
  )

  it('steps to the next account', () => {
    const [{ addressNList }] = core.aptosGetAccountPaths({ accountIdx: 0 })
    expect(core.aptosNextAccountPath({ addressNList })).toEqual(
      core.aptosGetAccountPaths({ accountIdx: 1 })[0],
    )
  })
})
