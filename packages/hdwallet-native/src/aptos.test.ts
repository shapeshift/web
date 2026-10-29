import * as core from '@shapeshiftoss/hdwallet-core'
import { beforeAll, describe, expect, it } from 'vitest'

import * as native from './native'

const MNEMONIC = 'all all all all all all all all all all all all'

// addresses from @aptos-labs/ts-sdk Account.fromDerivationPath at m/44'/637'/<account>'/0'/0'
const SDK_ADDRESSES = [
  '0xdb3d33094a6d31436739ef679c379c793a5656a25cf997c929b667244051a6b9',
  '0x6ee995262e7dd5e28ade07309607f34bc542e667d6cc3c97277a33249a9c91b3',
]

// 0x1::aptos_account::transfer of 1000 octas from account 0 to account 1, signed by the sdk
const RAW_TRANSACTION_HEX =
  'db3d33094a6d31436739ef679c379c793a5656a25cf997c929b667244051a6b900000000000000000200000000000000000000000000000000000000000000000000000000000000010d6170746f735f6163636f756e74087472616e736665720002206ee995262e7dd5e28ade07309607f34bc542e667d6cc3c97277a33249a9c91b308e803000000000000d007000000000000640000000000000000d2496b0000000001'
const SDK_SIGNATURE =
  '2efe10d30bdae93fecf9df3777c5226e318f085f28b806f10b4ee078137ee8705a4cd30d56ad3260a8f7b776019995512d882b02c51539f1469ba525b0a51d0d'
const SDK_PUBLIC_KEY = '91a9107e2d1d6e3cf8de5be7d7b7e7031dc773797ce04f889ecaf08af90c42dc'

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

  it('signs a raw transaction identically to the sdk', async () => {
    const [{ addressNList }] = core.aptosGetAccountPaths({ accountIdx: 0 })
    const rawTransactionBytes = Buffer.from(RAW_TRANSACTION_HEX, 'hex')

    await expect(wallet.aptosSignTx({ addressNList, rawTransactionBytes })).resolves.toEqual({
      signature: SDK_SIGNATURE,
      publicKey: SDK_PUBLIC_KEY,
      rawTransactionBytes,
    })
  })
})
