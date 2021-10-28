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
export const bip32FromScript = (scriptType: BTCInputScriptType, asset: Asset): BIP32Params => {
  const purpose = purposeFromScript(scriptType)
  return { purpose, coinType: asset.slip44, accountNumber: 0 }
}

/**
 * Returns coin purpose from a given script type
 * @param scriptType
 * @returns 44 | 49 | 84
 */
export const purposeFromScript = (scriptType: BTCInputScriptType): 44 | 49 | 84 => {
  if (scriptType === BTCInputScriptType.SpendP2SHWitness) return 49
  else if (scriptType === BTCInputScriptType.SpendAddress) return 44
  else if (scriptType === BTCInputScriptType.SpendWitness) return 84
  else throw new Error('invalid script type')
}

/**
 * Utility function to get params to get BIP32Params and scriptType for chain-adapter functions (getAddress, buildSendTransaction)
 * Get return an object with utxo bip32Params derived from script type and asset
 * @param scriptType
 * @param asset
 * @returns object with BIP32Params and scriptType or undefined
 */
export const bip32AndScript = (
  scriptType: BTCInputScriptType,
  asset: Asset
): { bip32Params: BIP32Params; scriptType: BTCInputScriptType } | undefined => {
  if (asset.chain === ChainTypes.Bitcoin)
    return { bip32Params: bip32FromScript(scriptType, asset), scriptType }
  else return undefined
}
