// @ts-ignore we don't have typings for this bad boi
import crypto from 'crypto-browserify'

export const sha256 = (input: string): string =>
  crypto.createHash('sha256').update(input).digest('hex')
