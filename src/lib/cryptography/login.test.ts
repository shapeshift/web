import * as webcrypto from '@peculiar/webcrypto'

import { decryptNativeWallet, getPasswordHash } from './login'

describe('login', () => {
  globalThis.crypto = new webcrypto.Crypto()

  describe('password-hash', () => {
    it('should fail on getPasswordHash without email', async () => {
      const email = ''
      const password = 'testing123*'

      await expect(getPasswordHash(email, password)).rejects.toThrow(
        'An email and password are required to hash the password.',
      )
    })
    it('should fail on getPasswordHash without password', async () => {
      const email = 'test@test.com'
      const password = ''

      await expect(getPasswordHash(email, password)).rejects.toThrow(
        'An email and password are required to hash the password.',
      )
    })

    it('should properly hash email and password', async () => {
      const email = 'tester987zyx@test.com'
      const password = 'tester987zyx!'
      await expect(getPasswordHash(email, password)).resolves.toEqual(
        'a6EWN3FQlPvRpRfvuQyK69Ofmg1ZioeEencQ/dcQZyE=',
      )
    })
  })

  describe('decryption', () => {
    it('should fail without an email', async () => {
      const email = ''
      const password = 'tester987zyx!'
      const ciphertext =
        '2.wP7o4H3io+CPisP+TNpohVo/63gvQofLDo6wbQCm+kYhNKyrjNLxpBtQhVY7A8TKjLCe12/2TIA+ZTjXEWYWOFfkVDZb98kmrzTHs96I53U=|voFDdSgALQ/1CfD1gI3n9g==|JAEcRQZrgMLabQGKVBaVVo5FapkfRLLr6quANJ6GC1M='
      await expect(decryptNativeWallet(email, password, ciphertext)).rejects.toThrow(
        'An email and password are required to decrypt the wallet.',
      )
    })
    it('should fail without a password', async () => {
      const email = 'tester987zyx@test.com'
      const password = ''
      const ciphertext =
        '2.wP7o4H3io+CPisP+TNpohVo/63gvQofLDo6wbQCm+kYhNKyrjNLxpBtQhVY7A8TKjLCe12/2TIA+ZTjXEWYWOFfkVDZb98kmrzTHs96I53U=|voFDdSgALQ/1CfD1gI3n9g==|JAEcRQZrgMLabQGKVBaVVo5FapkfRLLr6quANJ6GC1M='
      await expect(decryptNativeWallet(email, password, ciphertext)).rejects.toThrow(
        'An email and password are required to decrypt the wallet.',
      )
    })
    it('should fail without an encryptedWallet', async () => {
      const ciphertext = ''
      const email = 'tester987zyx@test.com'
      const password = 'tester987zyx!'
      await expect(decryptNativeWallet(email, password, ciphertext)).rejects.toThrow(
        'An encryptedWallet is required for decryption.',
      )
    })
    // The following test works well when running jest, but not when running react-app-rewired test
    // as our CI server does. Skipping the test, because the behavior does work in the browser, and
    // I want to keep the parameters here for expected behavior.
    it.skip('should properly decrypt', async () => {
      const email = 'tester987zyx@test.com'
      const password = 'tester987zyx!'
      const ciphertext =
        '2.wP7o4H3io+CPisP+TNpohVo/63gvQofLDo6wbQCm+kYhNKyrjNLxpBtQhVY7A8TKjLCe12/2TIA+ZTjXEWYWOFfkVDZb98kmrzTHs96I53U=|voFDdSgALQ/1CfD1gI3n9g==|JAEcRQZrgMLabQGKVBaVVo5FapkfRLLr6quANJ6GC1M='
      await expect(decryptNativeWallet(email, password, ciphertext)).resolves.toEqual(
        // Unused seed created specifically for this test.
        'unaware cannon crouch misery lift balance ladder trust train dream file crush',
      )
    })
  })
})
