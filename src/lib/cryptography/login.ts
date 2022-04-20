import { BinaryLike, pbkdf2Sync } from 'crypto'
import scrypt from 'scrypt-js'

const textEncoder = new TextEncoder()

function fromUtf8ToArray(str: string): BinaryLike {
  return new Uint8Array(Buffer.from(str, 'utf8'))
}

function toArrayBuffer(value: BinaryLike): BinaryLike {
  let buf: BinaryLike
  if (typeof value === 'string') {
    buf = fromUtf8ToArray(value)
  } else {
    buf = value
  }
  return buf
}

function pbkdf2(password: BinaryLike, key: BinaryLike, iterations: number): ArrayBuffer {
  const salt = toArrayBuffer(password)
  return pbkdf2Sync(key, salt, iterations, 32, 'SHA256')
}

export function getPasswordHash(email: string, password: string): string {
  if (!password || !email) {
    throw new Error('An email and password are required to hash the password.')
  }
  const key = getKey(email, password)
  const digest = pbkdf2(password, key, 1)
  return Buffer.from(digest).toString('base64')
}

export function getKey(email: string, password: string): Uint8Array {
  const salt = new Uint8Array(textEncoder.encode(email.normalize('NFKC')))
  const passwordArray = new Uint8Array(textEncoder.encode(password.normalize('NFKC')))
  return scrypt.syncScrypt(passwordArray, salt, 16384, 8, 1, 32)
}
