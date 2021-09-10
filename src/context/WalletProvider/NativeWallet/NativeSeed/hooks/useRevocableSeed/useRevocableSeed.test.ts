import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'
import { renderHook } from '@testing-library/react-hooks'

import { useRevocableSeed } from './useRevocableSeed'

jest.mock('react-router-dom', () => ({ useLocation: jest.fn(), useHistory: jest.fn() }))
jest.mock('bip39', () => ({ generateMnemonic: jest.fn() }))

const mnemonic = 'one two three four five six seven eight nine ten eleven twelve'

const setup = (encryptedWallet?: EncryptedWallet) => {
  return renderHook(() => useRevocableSeed(encryptedWallet))
}

describe('useRevocableSeed', () => {
  it('generates wallet and sets seed', async () => {
    const encryptedWallet = {
      encryptedWallet: '',
      decrypt: jest.fn().mockResolvedValue(mnemonic),
      createWallet: jest.fn().mockResolvedValue('')
    }
    const { result, waitFor } = setup(encryptedWallet as unknown as EncryptedWallet)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.revocableSeed.proxy.seed).toBe(mnemonic)
  })

  it('errors when creating and decrypting', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const encryptedWallet = {
      encryptedWallet: '',
      decrypt: jest.fn().mockRejectedValue(''),
      createWallet: jest.fn().mockResolvedValue('')
    }
    const { result, waitFor } = setup(encryptedWallet as unknown as EncryptedWallet)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(console.error).toBeCalled()
    consoleError.mockRestore()
  })
})
