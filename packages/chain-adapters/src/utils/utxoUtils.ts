import {
  ASSET_REFERENCE,
  bchChainId,
  btcChainId,
  ChainId,
  dogeChainId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import { BTCInputScriptType, BTCOutputScriptType } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import { decode, encode } from 'bs58check'

/**
 * Utility function to convert a BTCInputScriptType to the corresponding BTCOutputScriptType
 * @param x a BTCInputScriptType
 * @returns the corresponding BTCOutputScriptType
 */
export const toBtcOutputScriptType = (x: BTCInputScriptType) => {
  switch (x) {
    case BTCInputScriptType.SpendWitness:
      return BTCOutputScriptType.PayToWitness
    case BTCInputScriptType.SpendP2SHWitness:
      return BTCOutputScriptType.PayToP2SHWitness
    case BTCInputScriptType.SpendMultisig:
      return BTCOutputScriptType.PayToMultisig
    case BTCInputScriptType.SpendAddress:
      return BTCOutputScriptType.PayToAddress
    default:
      throw new TypeError('scriptType')
  }
}

/**
 * Utility function to get BIP44Params and scriptType
 */
export const utxoAccountParams = (
  chainId: ChainId,
  accountType: UtxoAccountType,
  accountNumber: number,
): { bip44Params: BIP44Params; scriptType: BTCInputScriptType } => {
  // TODO: dynamic coinType assignment to reduce copy/pasta
  switch (chainId) {
    case dogeChainId:
      return {
        scriptType: BTCInputScriptType.SpendAddress,
        bip44Params: {
          purpose: 44,
          coinType: Number(ASSET_REFERENCE.Dogecoin),
          accountNumber,
        },
      }
    case btcChainId:
      switch (accountType) {
        case UtxoAccountType.SegwitNative:
          return {
            scriptType: BTCInputScriptType.SpendWitness,
            bip44Params: {
              purpose: 84,
              coinType: Number(ASSET_REFERENCE.Bitcoin),
              accountNumber,
            },
          }
        case UtxoAccountType.SegwitP2sh:
          return {
            scriptType: BTCInputScriptType.SpendP2SHWitness,
            bip44Params: {
              purpose: 49,
              coinType: Number(ASSET_REFERENCE.Bitcoin),
              accountNumber,
            },
          }
        case UtxoAccountType.P2pkh:
          return {
            scriptType: BTCInputScriptType.SpendAddress,
            bip44Params: {
              purpose: 44,
              coinType: Number(ASSET_REFERENCE.Bitcoin),
              accountNumber,
            },
          }
        default:
          throw new TypeError('utxoAccountType')
      }
    case bchChainId:
      return {
        scriptType: BTCInputScriptType.SpendAddress,
        bip44Params: {
          purpose: 44,
          coinType: Number(ASSET_REFERENCE.BitcoinCash),
          accountNumber,
        },
      }
    case ltcChainId:
      switch (accountType) {
        case UtxoAccountType.SegwitNative:
          return {
            scriptType: BTCInputScriptType.SpendWitness,
            bip44Params: {
              purpose: 84,
              coinType: Number(ASSET_REFERENCE.Litecoin),
              accountNumber,
            },
          }
        case UtxoAccountType.SegwitP2sh:
          return {
            scriptType: BTCInputScriptType.SpendP2SHWitness,
            bip44Params: {
              purpose: 49,
              coinType: Number(ASSET_REFERENCE.Litecoin),
              accountNumber,
            },
          }
        case UtxoAccountType.P2pkh:
          return {
            scriptType: BTCInputScriptType.SpendAddress,
            bip44Params: {
              purpose: 44,
              coinType: Number(ASSET_REFERENCE.Litecoin),
              accountNumber,
            },
          }
        default:
          throw new TypeError('utxoAccountType')
      }
    default:
      throw new TypeError(`not a supported utxo chain ${chainId}`)
  }
}

export const accountTypeToScriptType: Record<UtxoAccountType, BTCInputScriptType> = Object.freeze({
  [UtxoAccountType.P2pkh]: BTCInputScriptType.SpendAddress,
  [UtxoAccountType.SegwitP2sh]: BTCInputScriptType.SpendP2SHWitness,
  [UtxoAccountType.SegwitNative]: BTCInputScriptType.SpendWitness,
})

export const accountTypeToOutputScriptType: Record<UtxoAccountType, BTCOutputScriptType> =
  Object.freeze({
    [UtxoAccountType.P2pkh]: BTCOutputScriptType.PayToAddress,
    [UtxoAccountType.SegwitP2sh]: BTCOutputScriptType.PayToP2SHWitness,
    [UtxoAccountType.SegwitNative]: BTCOutputScriptType.PayToWitness,
  })

export const scriptTypeToAccountType: Record<BTCInputScriptType, UtxoAccountType | undefined> =
  Object.freeze({
    [BTCInputScriptType.SpendAddress]: UtxoAccountType.P2pkh,
    [BTCInputScriptType.SpendP2SHWitness]: UtxoAccountType.SegwitP2sh,
    [BTCInputScriptType.SpendWitness]: UtxoAccountType.SegwitNative,
    [BTCInputScriptType.SpendMultisig]: undefined,
    [BTCInputScriptType.Bech32]: undefined,
    [BTCInputScriptType.CashAddr]: undefined,
    [BTCInputScriptType.External]: undefined,
  })

/*
 * @see https://github.com/blockkeeper/blockkeeper-frontend-web/issues/38
 *
 * ypub and zpub are defined by BIP48 and BIP84 as special version bytes for use in the BIP44
 * encoding of the keys for their respective account types. Defining custom serialization formats
 * for different account types has since fallen out of favor (as in BIP86) but getting these bytes
 * correct is relevant for interoperation with a variety of other software (like Blockbook).
 *
 * The only difference compared to xpub is a prefix, but as it is a base58 encoded string with a
 * checksum, the checksum is also different.
 *
 * The easiest way to fix it is to decode from base58check, replace the prefix to
 * standard xpub or ypub and then to encode back to base58check. Then one can use this xpub
 * as normal bip44 master key.
 *
 * It may make sense to remember the type of the public key as it tells what type of script
 * is used in the wallet.
 *
 */
enum PublicKeyType {
  xpub = '0488b21e',
  ypub = '049d7cb2',
  zpub = '04b24746',
  dgub = '02facafd',
  Ltub = '019da462',
  Mtub = '01b26ef6',
}

const accountTypeToVersion = {
  [UtxoAccountType.P2pkh]: Buffer.from(PublicKeyType.xpub, 'hex'),
  [UtxoAccountType.SegwitP2sh]: Buffer.from(PublicKeyType.ypub, 'hex'),
  [UtxoAccountType.SegwitNative]: Buffer.from(PublicKeyType.zpub, 'hex'),
}

const convertVersions = ['xpub', 'ypub', 'zpub']

/**
 * Convert any public key into an xpub, ypub, or zpub based on account type
 *
 * Blockbook generates addresses from a public key based on the version bytes
 * some wallets always return the public key in "xpub" format, so we need to convert those
 *
 * USE SPARINGLY - there aren't many cases where we should convert version bytes
 * @param {string} xpub - the public key provided by the wallet
 * @param {UtxoAccountType} accountType - The desired account type to be encoded into the public key
 */
export function convertXpubVersion(xpub: string, accountType: UtxoAccountType) {
  if (!convertVersions.includes(xpub.substring(0, 4))) {
    return xpub
  }

  const payload = decode(xpub)
  const version = payload.slice(0, 4)
  if (version.compare(accountTypeToVersion[accountType]) !== 0) {
    // Get the key without the version code at the front
    const key = payload.slice(4)
    return encode(Buffer.concat([accountTypeToVersion[accountType], key]))
  }
  return xpub
}
