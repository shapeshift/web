import type { StarknetWindowObject } from '@starknet-io/types-js'
import { constants } from 'starknet'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StarknetInjectedHDWallet } from '.'

const SHORT_ADDRESS = '0x123abc'
const PADDED_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000123abc'

describe('StarknetInjectedHDWallet', () => {
  let request: ReturnType<typeof vi.fn>
  let wallet: StarknetInjectedHDWallet

  beforeEach(() => {
    request = vi.fn()
    const provider = {
      id: 'braavos',
      name: 'Braavos',
      version: '4.0.0',
      icon: '',
      request,
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as StarknetWindowObject

    wallet = new StarknetInjectedHDWallet('braavos', provider, 'Braavos')
  })

  it('connects silently and pads the address to 64 hex chars', async () => {
    request.mockResolvedValueOnce([SHORT_ADDRESS])

    expect(await wallet.connect(true)).toBe(PADDED_ADDRESS)
    expect(request).toHaveBeenCalledWith({
      type: 'wallet_requestAccounts',
      params: { silent_mode: true },
    })

    // Cached after connecting, no further prompts
    expect(await wallet.starknetGetAddress()).toBe(PADDED_ADDRESS)
    expect(await wallet.getDeviceID()).toBe(`braavos:${PADDED_ADDRESS}`)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('returns null when no account is authorized', async () => {
    request.mockResolvedValueOnce([])
    expect(await wallet.connect(true)).toBeNull()
  })

  describe('starknetSendTx', () => {
    const txToSign = {
      addressNList: [],
      txHash: '0x0',
      // Builders emit decimal uint256 halves, the wallet API only accepts hex
      calls: [{ contractAddress: '0x1', entrypoint: 'transfer', calldata: ['0x2', '10', '0'] }],
    }

    beforeEach(async () => {
      request.mockResolvedValueOnce([SHORT_ADDRESS])
      await wallet.connect()
      request.mockClear()
    })

    it('sends the calls through wallet_addInvokeTransaction with hex calldata', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_MAIN)
        .mockResolvedValueOnce([SHORT_ADDRESS])
        .mockResolvedValueOnce({ transaction_hash: '0xdeadbeef' })

      expect(await wallet.starknetSendTx(txToSign)).toEqual({ hash: '0xdeadbeef' })
      // Not silent, so a locked extension prompts an unlock
      expect(request).toHaveBeenCalledWith({
        type: 'wallet_requestAccounts',
        params: { silent_mode: false },
      })
      expect(request).toHaveBeenLastCalledWith({
        type: 'wallet_addInvokeTransaction',
        params: {
          calls: [
            { contract_address: '0x1', entry_point: 'transfer', calldata: ['0x2', '0xa', '0x0'] },
          ],
        },
      })
    })

    it('switches back to mainnet before sending', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce([SHORT_ADDRESS])
        .mockResolvedValueOnce({ transaction_hash: '0xdeadbeef' })

      expect(await wallet.starknetSendTx(txToSign)).toEqual({ hash: '0xdeadbeef' })
      expect(request.mock.calls.map(([call]) => call.type)).toEqual([
        'wallet_requestChainId',
        'wallet_switchStarknetChain',
        'wallet_requestAccounts',
        'wallet_addInvokeTransaction',
      ])
    })

    it('does not send when the user stays on another network', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)
        .mockResolvedValueOnce(false)

      await expect(wallet.starknetSendTx(txToSign)).rejects.toMatchObject({ code: 'WRONG_NETWORK' })
      expect(request).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wallet_addInvokeTransaction' }),
      )
    })

    it('does not send from an account other than the one the tx was built for', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_MAIN)
        .mockResolvedValueOnce(['0x456def'])

      await expect(wallet.starknetSendTx(txToSign)).rejects.toMatchObject({
        code: 'ACCOUNT_CHANGED',
      })
      expect(request).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wallet_addInvokeTransaction' }),
      )
    })
  })

  it('refuses to send without calls', async () => {
    await expect(wallet.starknetSendTx({ addressNList: [], txHash: '0x0' })).rejects.toThrow(
      'calls are required',
    )
    expect(request).not.toHaveBeenCalled()
  })
})
