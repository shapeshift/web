import type { Keystore } from '@shapeshiftoss/hdwallet-native-vault'
import { blake2bHex } from 'blakejs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function decryptFromKeystore(keystore: Keystore, password: string): Promise<string> {
  const { cipher, cipherparams, ciphertext, kdf, kdfparams, mac } = keystore.crypto
  const { c, dklen, prf, salt } = kdfparams
  const { iv } = cipherparams

  if (kdf !== 'pbkdf2') throw new Error(`Unsupported KDF: ${kdf}`)
  if (prf !== 'hmac-sha256') throw new Error(`Unsupported PBKDF2 PRF: ${prf}`)
  if (cipher !== 'aes-128-ctr') throw new Error(`Unsupported Cipher: ${cipher}`)

  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])

  const derivedKey = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: Buffer.from(salt, 'hex'),
        iterations: c,
        hash: 'SHA-256',
      },
      baseKey,
      dklen * 8,
    ),
  )

  const data = new Uint8Array([...derivedKey.subarray(16, 32), ...Buffer.from(ciphertext, 'hex')])
  const macBlake256 = blake2bHex(data, undefined, 32)

  if (macBlake256 !== mac) throw new Error('Invalid password')

  const aesKey = await crypto.subtle.importKey(
    'raw',
    derivedKey.subarray(0, 16),
    {
      name: 'AES-CTR',
      length: 128,
    },
    false,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-CTR',
      counter: new Uint8Array(Buffer.from(iv, 'hex')),
      length: 128,
    },
    aesKey,
    Buffer.from(ciphertext, 'hex'),
  )

  return decoder.decode(decrypted)
}
