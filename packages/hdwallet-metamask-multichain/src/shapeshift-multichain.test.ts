import * as core from '@shapeshiftoss/hdwallet-core'
import * as snapsAdapter from '@shapeshiftoss/metamask-snaps-adapter'
import type { EIP6963ProviderInfo } from 'mipd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MetaMaskMultiChainHDWallet, MetaMaskMultiChainHDWalletInfo } from '.'

vi.mock('@shapeshiftoss/metamask-snaps-adapter', async importOriginal => ({
  ...(await importOriginal<typeof snapsAdapter>()),
  cosmosGetAddress: vi.fn(),
  cosmosSignTransaction: vi.fn(),
  thorchainGetAddress: vi.fn(),
  thorchainSignTransaction: vi.fn(),
}))

describe('HDWalletInfo', () => {
  const info = new MetaMaskMultiChainHDWalletInfo()

  it('should have correct metadata', async () => {
    expect(info.getVendor()).toBe('MetaMask')
    expect(info.hasOnDevicePinEntry()).toBe(false)
    expect(info.hasOnDevicePassphrase()).toBe(true)
    expect(info.hasOnDeviceDisplay()).toBe(true)
    expect(info.hasOnDeviceRecovery()).toBe(true)
    expect(await info.ethSupportsNetwork(1)).toBe(true)
    expect(await info.ethSupportsSecureTransfer()).toBe(false)
    expect(info.ethSupportsNativeShapeShift()).toBe(false)
    expect(await info.ethSupportsEIP1559()).toBe(true)
    expect(await info.supportsOfflineSigning()).toBe(false)
    expect(await info.supportsBroadcast()).toBe(true)
  })
})

const sendTxMsg: core.ETHSignTx = {
  addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
  nonce: '0xDEADBEEF',
  gasPrice: '0xDEADBEEF',
  gasLimit: '0xDEADBEEF',
  to: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
  value: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
  data: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
  chainId: 57073,
}

const addChainParams: core.AddEthereumChainParameter = {
  chainId: '0xdef1',
  chainName: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc-gel.inkonchain.com'],
  blockExplorerUrls: ['https://explorer.inkonchain.com'],
}

describe('MetaMaskMultiChainHDWallet', () => {
  let wallet: MetaMaskMultiChainHDWallet
  beforeEach(() => {
    wallet = new MetaMaskMultiChainHDWallet({
      provider: core.untouchable('MetaMaskMultiChainHDWallet:provider'),
      info: { rdns: 'io.metamask' } as EIP6963ProviderInfo,
    })
    wallet.ethAddress = '0x73d0385F4d8E00C5e6504C6030F47BF6212736A8'
    wallet.providerRdns = 'io.metamask'
  })

  it('should match the metadata', async () => {
    expect(wallet.getVendor()).toBe('MetaMask')
    expect(wallet.hasOnDevicePinEntry()).toBe(false)
    expect(wallet.hasOnDevicePassphrase()).toBe(true)
    expect(wallet.hasOnDeviceDisplay()).toBe(true)
    expect(wallet.hasOnDeviceRecovery()).toBe(true)
    expect(await wallet.ethSupportsNetwork(1)).toBe(true)
    expect(await wallet.ethSupportsSecureTransfer()).toBe(false)
    expect(wallet.ethSupportsNativeShapeShift()).toBe(false)
    expect(await wallet.ethSupportsEIP1559()).toBe(true)
    expect(await wallet.supportsOfflineSigning()).toBe(false)
    expect(wallet.supportsBip44Accounts()).toBe(false)
    expect(await wallet.supportsBroadcast()).toBe(true)
  })

  it('signs thorchain txs without an address cached on this wallet instance', async () => {
    const signedTx = { serialized: 'signed', body: '', authInfoBytes: '', signatures: [] }
    vi.mocked(snapsAdapter.thorchainSignTransaction).mockResolvedValue(signedTx)

    const msg: core.ThorchainSignTx = {
      addressNList: core.bip32ToAddressNList("m/44'/931'/0'/0/0"),
      tx: {
        msg: [{ type: 'thorchain/MsgDeposit', value: {} }],
        fee: { amount: [{ amount: '0', denom: 'rune' }], gas: '500000000' },
        signatures: [],
        memo: 'tcy+',
      },
      chain_id: 'thorchain-1',
      account_number: '0',
      sequence: '0',
    }

    expect(await wallet.thorchainSignTx(msg)).toEqual(signedTx)
    expect(snapsAdapter.thorchainGetAddress).not.toHaveBeenCalled()
    expect(snapsAdapter.thorchainSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: msg }),
    )
  })

  it('signs cosmos txs without an address cached on this wallet instance', async () => {
    const signedTx = { serialized: 'signed', body: '', authInfoBytes: '', signatures: [] }
    vi.mocked(snapsAdapter.cosmosSignTransaction).mockResolvedValue(signedTx)

    const msg: core.CosmosSignTx = {
      addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
      tx: {
        msg: [{ type: 'cosmos-sdk/MsgSend', value: {} }],
        fee: { amount: [{ amount: '5000', denom: 'uatom' }], gas: '200000' },
        signatures: [],
      },
      chain_id: 'cosmoshub-4',
      account_number: '0',
      sequence: '0',
    }

    expect(await wallet.cosmosSignTx(msg)).toEqual(signedTx)
    expect(snapsAdapter.cosmosGetAddress).not.toHaveBeenCalled()
    expect(snapsAdapter.cosmosSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: msg }),
    )
  })

  it('should test ethSignMessage', async () => {
    wallet.provider = {
      request: vi.fn().mockReturnValue(
        `Object {
          "address": "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
          "signature": "0x05f51140905ffa33ffdc57f46b0b8d8fbb1d2a99f8cd843ca27893c01c31351c08b76d83dce412731c846e3b50649724415deb522d00950fbf4f2c1459c2b70b1b",
        }`,
      ),
    }
    const msg = '0x737570657220736563726574206d657373616765' // super secret message
    expect(
      await wallet.ethSignMessage({
        addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
        message: msg,
      }),
    ).toMatchInlineSnapshot(`
      {
        "address": "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
        "signature": "Object {
                "address": "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
                "signature": "0x05f51140905ffa33ffdc57f46b0b8d8fbb1d2a99f8cd843ca27893c01c31351c08b76d83dce412731c846e3b50649724415deb522d00950fbf4f2c1459c2b70b1b",
              }",
      }
    `)
  })

  it('ethSignMessage throws the provider error', async () => {
    wallet.provider = {
      request: vi.fn().mockRejectedValue(new Error('An Error has occurred')),
    }

    const msg = '0x737570657220736563726574206d657373616765' // super secret message
    await expect(
      wallet.ethSignMessage({
        addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
        message: msg,
      }),
    ).rejects.toThrow('An Error has occurred')
  })

  it('ethGetAddress returns a valid address', async () => {
    wallet.provider = {
      request: vi.fn().mockReturnValue(['0x73d0385F4d8E00C5e6504C6030F47BF6212736A8']),
    }

    const msg = '0x737570657220736563726574206d657373616765' // super secret message
    const sig = await wallet.ethSignMessage({
      addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
      message: msg,
    })

    expect(sig).toMatchObject({
      address: '0x73d0385F4d8E00C5e6504C6030F47BF6212736A8',
      signature: ['0x73d0385F4d8E00C5e6504C6030F47BF6212736A8'],
    })
  })
  it('ethSendTx returns a valid hash', async () => {
    wallet.provider = {
      request: vi.fn().mockReturnValue('0x123'),
    }

    const hash = await wallet.ethSendTx(sendTxMsg)
    expect(wallet.provider.request).toHaveBeenCalled()
    expect(hash).toMatchObject({ hash: '0x123' })
  })
  it('ethSendTx returns a valid hash if maxFeePerGas is present in msg', async () => {
    wallet.provider = {
      request: vi.fn().mockReturnValue('0x123'),
    }

    const hash = await wallet.ethSendTx({
      addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
      nonce: '0xDEADBEEF',
      gasLimit: '0xDEADBEEF',
      maxFeePerGas: '0xDEADBEEF',
      maxPriorityFeePerGas: '0xDEADBEEF',
      to: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
      value: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
      data: '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
      chainId: 1,
    })
    expect(wallet.provider.request).toHaveBeenCalled()
    expect(hash).toMatchObject({ hash: '0x123' })
  })
  it('ethSendTx throws the provider error', async () => {
    wallet.provider = {
      request: vi.fn().mockRejectedValue(new Error('An Error has occurred')),
    }

    await expect(wallet.ethSendTx(sendTxMsg)).rejects.toThrow('An Error has occurred')
  })
  it('ethSendTx requests account permissions and retries when the chain is unauthorized', async () => {
    wallet.provider = {
      request: vi
        .fn()
        .mockRejectedValueOnce({ code: 4100, message: 'not authorized' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('0x123'),
    }

    const hash = await wallet.ethSendTx(sendTxMsg)

    expect(wallet.provider.request).toHaveBeenNthCalledWith(2, {
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    })
    expect(wallet.provider.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ method: 'eth_sendTransaction' }),
    )
    expect(hash).toMatchObject({ hash: '0x123' })
  })
  it.each([
    ['unrecognized chain', { code: 4902, message: 'Unrecognized chain ID' }],
    [
      'wrapped unrecognized chain',
      { code: -32603, message: 'Internal error', data: { originalError: { code: 4902 } } },
    ],
  ])('ethSwitchChain adds the chain on %s', async (_, switchError) => {
    wallet.provider = {
      request: vi.fn().mockRejectedValueOnce(switchError).mockResolvedValueOnce(null),
    }

    await wallet.ethSwitchChain(addChainParams)

    expect(wallet.provider.request).toHaveBeenNthCalledWith(2, {
      method: 'wallet_addEthereumChain',
      params: [addChainParams],
    })
  })
  it('ethSwitchChain resolves when MetaMask errors after adding the chain', async () => {
    wallet.provider = {
      request: vi
        .fn()
        .mockRejectedValueOnce({ code: 4902, message: 'Unrecognized chain ID' })
        .mockRejectedValueOnce({ code: -32603, message: 'n.find is not a function' }),
    }

    await expect(wallet.ethSwitchChain(addChainParams)).resolves.toBeUndefined()
  })
  it('ethSwitchChain adds the chain when the provider error has no code', async () => {
    wallet.provider = {
      request: vi
        .fn()
        .mockRejectedValueOnce(new Error('Unrecognized chain ID'))
        .mockResolvedValueOnce(null),
    }

    await wallet.ethSwitchChain(addChainParams)

    expect(wallet.provider.request).toHaveBeenNthCalledWith(2, {
      method: 'wallet_addEthereumChain',
      params: [addChainParams],
    })
  })
  it('ethSwitchChain throws a user rejection without adding the chain', async () => {
    wallet.provider = {
      request: vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected the request.' }),
    }

    await expect(wallet.ethSwitchChain(addChainParams)).rejects.toMatchObject({ code: 4001 })
    expect(wallet.provider.request).toHaveBeenCalledTimes(1)
  })
  it('ethVerifyMessage returns null as its not implemented', async () => {
    wallet.provider = {
      request: vi.fn().mockReturnValue('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8'),
    }
    expect(
      await wallet.ethVerifyMessage({
        address: '0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8',
        message: 'hello world',
        signature:
          '0x29f7212ecc1c76cea81174af267b67506f754ea8c73f144afa900a0d85b24b21319621aeb062903e856352f38305710190869c3ce5a1425d65ef4fa558d0fc251b',
      }),
    ).toEqual(null)
  })
})
