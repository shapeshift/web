import { constants } from 'starknet'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isStarknetInjected, StarknetInjectedHDWallet } from '.'
import type { StarknetWindowObject } from './types'

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

  it('should match the metadata', () => {
    expect(wallet.getVendor()).toBe('Braavos')
    expect(isStarknetInjected(wallet)).toBe(true)
    expect(wallet._supportsStarknet).toBe(true)
    expect(wallet.supportsOfflineSigning()).toBe(false)
    expect(wallet.supportsBroadcast()).toBe(true)
    expect(wallet.supportsBip44Accounts()).toBe(false)
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

  it('never touches the network on initialize, so restoring a session never prompts', async () => {
    await wallet.initialize()
    expect(request).not.toHaveBeenCalled()
  })

  it('reads the network without prompting', async () => {
    request.mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)

    expect(await wallet.isMainnet()).toBe(false)
    expect(request).toHaveBeenCalledWith({ type: 'wallet_requestChainId' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('asks to switch to mainnet when on another network', async () => {
    request.mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA).mockResolvedValueOnce(true)

    expect(await wallet.ensureMainnet()).toBe(true)
    expect(request).toHaveBeenLastCalledWith({
      type: 'wallet_switchStarknetChain',
      params: { chainId: constants.StarknetChainId.SN_MAIN },
    })
  })

  it('does not switch network when already on mainnet', async () => {
    request.mockResolvedValueOnce(constants.StarknetChainId.SN_MAIN)

    expect(await wallet.ensureMainnet()).toBe(false)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('throws when the user refuses to switch to mainnet', async () => {
    request.mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA).mockResolvedValueOnce(false)

    await expect(wallet.ensureMainnet()).rejects.toThrow('must be set to Starknet Mainnet')
  })

  describe('starknetSendTx', () => {
    const txToSign = {
      addressNList: [],
      txHash: '0x0',
      calls: [{ contractAddress: '0x1', entrypoint: 'transfer', calldata: ['0x2', '10', '0'] }],
    }

    beforeEach(async () => {
      request.mockResolvedValueOnce([SHORT_ADDRESS])
      await wallet.connect()
      request.mockClear()
    })

    it('sends unencoded calls through wallet_addInvokeTransaction', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_MAIN)
        .mockResolvedValueOnce([SHORT_ADDRESS])
        .mockResolvedValueOnce({ transaction_hash: '0xdeadbeef' })

      expect(await wallet.starknetSendTx(txToSign)).toEqual({ hash: '0xdeadbeef' })
      expect(request).toHaveBeenLastCalledWith({
        type: 'wallet_addInvokeTransaction',
        params: {
          calls: [
            { contract_address: '0x1', entry_point: 'transfer', calldata: ['0x2', '10', '0'] },
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

      await expect(wallet.starknetSendTx(txToSign)).rejects.toThrow('Starknet Mainnet')
      expect(request).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wallet_addInvokeTransaction' }),
      )
    })

    it('does not send from an account other than the one the tx was built for', async () => {
      request
        .mockResolvedValueOnce(constants.StarknetChainId.SN_MAIN)
        .mockResolvedValueOnce(['0x456def'])

      await expect(wallet.starknetSendTx(txToSign)).rejects.toThrow('account changed')
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

  it('cannot sign a raw transaction hash', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await wallet.starknetSignTx({ addressNList: [], txHash: '0x0' })).toBeNull()
  })
})
