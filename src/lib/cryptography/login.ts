import { pbkdf2Sync } from 'crypto'
import scrypt from 'scrypt-js'

const textEncoder = new TextEncoder()

export function getPasswordHash(email: string, password: string): string {
  if (!password || !email) {
    throw new Error('An email and password are required to hash the password.')
  }
  const key = getKey(email, password)
  const digest = pbkdf2Sync(Buffer.from(key), password, 1, 32, 'sha256')
  return Buffer.from(digest).toString('base64')
}

export function getKey(email: string, password: string): Uint8Array {
  const salt = new Uint8Array(textEncoder.encode(email.normalize('NFKC')))
  const passwordArray = new Uint8Array(textEncoder.encode(password.normalize('NFKC')))
  return scrypt.syncScrypt(passwordArray, salt, 16384, 8, 1, 32)
}
