import type { AccountMetadata } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import { signAndSubmitChainflipCall, signChainflipCall } from './eip712'
import { authorSubmitExtrinsic, cfEncodeNonNativeCall, stateGetRuntimeVersion } from './rpc'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

vi.mock('@/lib/utils/evm', () => ({
  assertGetEvmChainAdapter: vi.fn(),
}))

vi.mock('./rpc', () => ({
  cfEncodeNonNativeCall: vi.fn(),
  stateGetRuntimeVersion: vi.fn(),
  authorSubmitExtrinsic: vi.fn(),
}))

describe('chainflip eip712 helpers', () => {
  it('signs a chainflip call and preserves typed data from RPC', async () => {
    vi.mocked(stateGetRuntimeVersion).mockResolvedValue({
      specVersion: 20012,
      transactionVersion: 13,
    })
    vi.mocked(cfEncodeNonNativeCall).mockResolvedValue([
      {
        Eip712: {
          domain: { name: 'Chainflip-Mainnet', version: '1' },
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
            ],
            Foo: [{ name: 'bar', type: 'string' }],
          },
          message: { bar: 'baz' },
          primaryType: 'Foo',
        },
      },
      { nonce: 1, expiry_block: 2 },
    ])

    const signTypedData = vi.fn().mockResolvedValue(`0x${'aa'.repeat(32)}${'11'.repeat(32)}1b`)
    const adapter = {
      getAddress: vi.fn().mockResolvedValue(`0x${'22'.repeat(20)}`),
      getBip44Params: vi.fn().mockReturnValue({
        purpose: 44,
        coinType: 60,
        accountNumber: 0,
        isChange: false,
      }),
      signTypedData,
    }

    vi.mocked(assertGetEvmChainAdapter).mockReturnValue(adapter as never)

    const accountMetadata = { bip44Params: { accountNumber: 0 } } as AccountMetadata
    const result = await signChainflipCall({
      wallet: {} as never,
      accountMetadata,
      encodedCall: '0x01',
      nonceOrAccount: 0,
    })

    expect(signTypedData).toHaveBeenCalledTimes(1)
    const callInput = signTypedData.mock.calls[0][0]
    const typedData = callInput.typedDataToSign.typedData
    expect(typedData.types.EIP712Domain).toEqual([
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ])
    expect(typedData.types.Foo).toEqual([{ name: 'bar', type: 'string' }])
    expect(result.signature).toBe(`0x${'aa'.repeat(32)}${'11'.repeat(32)}1b`)
  })

  it('submits a signed chainflip call', async () => {
    vi.mocked(stateGetRuntimeVersion).mockResolvedValue({
      specVersion: 20012,
      transactionVersion: 13,
    })
    vi.mocked(cfEncodeNonNativeCall).mockResolvedValue([
      {
        Eip712: {
          domain: { name: 'Chainflip-Mainnet', version: '1' },
          types: { Foo: [{ name: 'bar', type: 'string' }] },
          message: { bar: 'baz' },
          primaryType: 'Foo',
        },
      },
      { nonce: 1, expiry_block: 2 },
    ])

    const signTypedData = vi.fn().mockResolvedValue(`0x${'aa'.repeat(32)}${'11'.repeat(32)}1b`)
    const adapter = {
      getAddress: vi.fn().mockResolvedValue(`0x${'22'.repeat(20)}`),
      getBip44Params: vi.fn().mockReturnValue({
        purpose: 44,
        coinType: 60,
        accountNumber: 0,
        isChange: false,
      }),
      signTypedData,
    }

    vi.mocked(assertGetEvmChainAdapter).mockReturnValue(adapter as never)
    vi.mocked(authorSubmitExtrinsic).mockResolvedValue('0xabc')

    const accountMetadata = { bip44Params: { accountNumber: 0 } } as AccountMetadata
    const result = await signAndSubmitChainflipCall({
      wallet: {} as never,
      accountMetadata,
      encodedCall: '0x01',
      nonceOrAccount: 0,
    })

    expect(result.txHash).toBe('0xabc')
  })
})
