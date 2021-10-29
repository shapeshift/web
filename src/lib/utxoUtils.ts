import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { Asset, ChainTypes } from '@shapeshiftoss/types'
import { BIP32Params } from '@shapeshiftoss/types'

/**
 * Utility function to get params for calling utxo based chain-adapter functions (getAddress, buildSendTransaction)
 * Get return an object with utxo bip32Params derived from script type and asset
 * @param scriptType
 * @param asset
 * @returns BIP32Params
 */
export const bip32FromScript = (
  scriptType: BTCInputScriptType | undefined,
  asset: Asset
): BIP32Params | undefined => {
  const purpose = purposeFromScript(scriptType)
  if (purpose) return { purpose, coinType: asset.slip44, accountNumber: 0 }
  return undefined
}

/**
 * Returns coin purpose from a given script type
 * @param scriptType
 * @returns 44 | 49 | 84
 */
export const purposeFromScript = (
  scriptType: BTCInputScriptType | undefined
): 44 | 49 | 84 | undefined => {
  switch (scriptType) {
    case BTCInputScriptType.SpendP2SHWitness:
      return 49
    case BTCInputScriptType.SpendAddress:
      return 44
    case BTCInputScriptType.SpendWitness:
      return 84
    default:
      return undefined
  }
}

/**
 * Utility function to get params to get BIP32Params and scriptType for chain-adapter functions (getAddress, buildSendTransaction)
 * Get return an object with utxo bip32Params derived from script type and asset
 * @param scriptType
 * @param asset
 * @returns object with BIP32Params and scriptType or undefined
 */
export const bip32AndScript = (
  scriptType: BTCInputScriptType | undefined,
  asset: Asset
): { bip32Params: BIP32Params; scriptType: BTCInputScriptType } | {} => {
  if (asset.chain === ChainTypes.Bitcoin && scriptType) {
    const bip32Params = bip32FromScript(scriptType, asset)
    if (bip32Params) return { bip32Params, scriptType }
  }
  return {}
}
