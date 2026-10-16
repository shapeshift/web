import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react'
import { stringToHex } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOnramperWalletAuth } from './useOnramperWalletAuth'

const { getAddress, signMessage, getBip44Params, toAddressNList } = vi.hoisted(() => ({
  getAddress: vi.fn(),
  signMessage: vi.fn(),
  getBip44Params: vi.fn(),
  toAddressNList: vi.fn(),
}))
vi.mock('@shapeshiftoss/chain-adapters', () => ({ toAddressNList }))
vi.mock('@/lib/utils/evm', () => ({
  assertGetEvmChainAdapter: () => ({ getAddress, signMessage, getBip44Params }),
}))
const wallet = { _supportsETH: true } as unknown as HDWallet
const metadata: AccountMetadata = {
  bip44Params: {
    purpose: 44,
    coinType: 60,
    accountNumber: 0,
    isChange: undefined,
    addressIndex: undefined,
  },
}
const address = '0x' + '11'.repeat(20)
beforeEach(() => {
  getAddress.mockReset().mockResolvedValue(address)
  signMessage.mockReset().mockResolvedValue('0xsigned')
  getBip44Params.mockReset()
  toAddressNList.mockReset().mockReturnValue([1, 2, 3])
})

describe('Onramper wallet signing', () => {
  it('signs the UTF-8 challenge as hex using the selected account derivation', async () => {
    const { result } = renderHook(() => useOnramperWalletAuth(wallet, metadata))
    await expect(
      result.current.signMessage('Authorize checkout', address, 'eip155:1'),
    ).resolves.toBe('0xsigned')
    expect(getAddress).toHaveBeenCalledWith({ wallet, accountNumber: 0 })
    expect(getBip44Params).toHaveBeenCalledWith(metadata.bip44Params)
    expect(signMessage).toHaveBeenCalledWith({
      wallet,
      messageToSign: { addressNList: [1, 2, 3], message: stringToHex('Authorize checkout') },
    })
  })
  it('refuses to sign for a manually supplied destination that the wallet does not control', async () => {
    const { result } = renderHook(() => useOnramperWalletAuth(wallet, metadata))
    await expect(
      result.current.signMessage('challenge', '0x' + '22'.repeat(20), 'eip155:1'),
    ).rejects.toThrow('fiatRamps.onramperWalletMismatch')
    expect(signMessage).not.toHaveBeenCalled()
  })
  it('rejects a disconnected wallet before signing', async () => {
    const { result } = renderHook(() => useOnramperWalletAuth(null, metadata))
    await expect(result.current.signMessage('challenge', address, 'eip155:1')).rejects.toThrow(
      'fiatRamps.onramperWalletUnsupported',
    )
    expect(signMessage).not.toHaveBeenCalled()
  })
  it('aborts an in-flight authorization if the connected wallet changes', () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: HDWallet | null }) => useOnramperWalletAuth(active, metadata),
      { initialProps: { active: wallet as HDWallet | null } },
    )
    const oldAuthorization = result.current
    rerender({ active: null })
    expect(() => oldAuthorization.assertActive()).toThrow('fiatRamps.onramperWalletChanged')
  })
})
