/*
 @see https://github.com/blockkeeper/blockkeeper-frontend-web/issues/38
 */
import { UtxoAccountType } from '@shapeshiftoss/types'
import { decode, encode } from 'bs58check'

/* ypub and zpub are not standard, it is an extension of the bip32 created by Trezor team
 * and adopted by the community. Currently, it has a pretty wide support in multiple wallets
 * including electrum. The only difference comparing to xpub is a prefix, but as it is
 * a base58 encoded string with a checksum, checksum is also different
 *
 * The easiest way to fix it is to decode from base58check, replace the prefix to
 * standard xpub or tpub and then to encode back to base58check. Then one can use this xpub
 * as normal bip32 master key.
 *
 * It may make sense to remember the type of the public key as it tells what type of script
 * is used in the wallet.
 *
 */

enum PublicKeyType {
  // mainnet
  xpub = '0488b21e', // xpub
  ypub = '049d7cb2', // ypub
  zpub = '04b24746', // zpub
  Ypub = '0295b43f', // Ypub
  Zpub = '02aa7ed3' // Zpub
}

const accountTypeToVersion = {
  [UtxoAccountType.P2pkh]: Buffer.from(PublicKeyType.xpub, 'hex'),
  [UtxoAccountType.SegwitP2sh]: Buffer.from(PublicKeyType.ypub, 'hex'),
  [UtxoAccountType.SegwitNative]: Buffer.from(PublicKeyType.zpub, 'hex')
}

export function normalizeXpub(xpub: string, accountType: UtxoAccountType) {
  const payload = decode(xpub)
  const version = payload.slice(0, 4)
  if (version.compare(accountTypeToVersion[accountType]) !== 0) {
    // Get the key without the version code at the front
    const key = payload.slice(4)
    return encode(Buffer.concat([accountTypeToVersion[accountType], key]))
  }
  return xpub
}
