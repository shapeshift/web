import { BTCInputScriptType, BTCOutputScriptType } from '@shapeshiftoss/hdwallet-core'
import { Asset } from '@shapeshiftoss/types'
import { BIP32Params, UtxoAccountType } from '@shapeshiftoss/types'

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
 * Utility function to get BIP32Params and scriptType for chain-adapter functions (getAddress, buildSendTransaction)
 * @param scriptType
 * @param asset
 * @returns object with BIP32Params and scriptType or undefined
 */
export const utxoAccountParams = (
  asset: Asset,
  utxoAccountType: UtxoAccountType,
  accountNumber: number
): { bip32Params: BIP32Params; scriptType: BTCInputScriptType } => {
  switch (utxoAccountType) {
    case UtxoAccountType.SegwitNative:
      return {
        scriptType: BTCInputScriptType.SpendWitness,
        bip32Params: {
          purpose: 84,
          coinType: asset.slip44,
          accountNumber
        }
      }
    case UtxoAccountType.SegwitP2sh:
      return {
        scriptType: BTCInputScriptType.SpendP2SHWitness,
        bip32Params: {
          purpose: 49,
          coinType: asset.slip44,
          accountNumber
        }
      }
    case UtxoAccountType.P2pkh:
      return {
        scriptType: BTCInputScriptType.SpendAddress,
        bip32Params: {
          purpose: 44,
          coinType: asset.slip44,
          accountNumber
        }
      }
    default:
      throw new TypeError('utxoAccountType')
  }
}
