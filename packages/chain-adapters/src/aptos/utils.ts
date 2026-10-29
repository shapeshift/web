import type { InputEntryFunctionData } from '@aptos-labs/ts-sdk'
import { AccountAddress } from '@aptos-labs/ts-sdk'
import { ASSET_NAMESPACE } from '@shapeshiftoss/caip'

import { APT_COIN_TYPE, COIN_TRANSFER_ABI, FA_TRANSFER_ABI } from './constants'

// fungible assets are referenced by metadata address, apt and legacy coins by move struct type
export const isFungibleAssetReference = (reference: string): boolean => !reference.includes('::')

export const getTokenAssetNamespace = (reference: string) =>
  isFungibleAssetReference(reference) ? ASSET_NAMESPACE.aptosFungible : ASSET_NAMESPACE.aptosCoin

// aptos addresses can differ in casing and leading zeros for the same account
export const addressesMatch = (a: string, b: string): boolean => {
  try {
    return AccountAddress.fromString(a).equals(AccountAddress.fromString(b))
  } catch {
    return false
  }
}

export const getTransferPayload = (
  to: string,
  value: string,
  contractAddress: string | undefined,
): InputEntryFunctionData => {
  if (contractAddress && isFungibleAssetReference(contractAddress)) {
    return {
      function: '0x1::primary_fungible_store::transfer',
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [contractAddress, to, BigInt(value)],
      abi: FA_TRANSFER_ABI,
    }
  }

  return {
    function: '0x1::aptos_account::transfer_coins',
    typeArguments: [contractAddress ?? APT_COIN_TYPE],
    functionArguments: [to, BigInt(value)],
    abi: COIN_TRANSFER_ABI,
  }
}
