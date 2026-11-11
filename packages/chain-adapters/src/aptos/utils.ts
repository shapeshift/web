import type {
  EntryFunction,
  InputEntryFunctionDataWithABI,
  InputViewFunctionData,
} from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  Deserializer,
  generateTransactionPayloadWithABI,
  Hex,
  RawTransaction,
  TransactionExecutableEntryFunction,
  TransactionExtraConfigV1,
  TransactionInnerPayloadV1,
  TransactionPayload,
  TransactionPayloadEntryFunction,
} from '@aptos-labs/ts-sdk'
import { ASSET_NAMESPACE, getAptosAssetNamespace } from '@shapeshiftoss/caip'

import { APT_COIN_TYPE, COIN_TRANSFER_ABI, FA_TRANSFER_ABI } from './constants'

export const isFungibleAssetReference = (reference: string): boolean =>
  getAptosAssetNamespace(reference) === ASSET_NAMESPACE.aptosFungible

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
): InputEntryFunctionDataWithABI => {
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

export const getSerializedTransferPayload = (
  to: string,
  value: string,
  contractAddress: string | undefined,
): string => {
  const payload = generateTransactionPayloadWithABI(getTransferPayload(to, value, contractAddress))

  return Hex.fromHexInput(payload.bcsToBytes()).toString()
}

export const deserializePayload = (payload: string): TransactionPayload =>
  TransactionPayload.deserialize(new Deserializer(Hex.fromHexInput(payload).toUint8Array()))

export const getDecimalsPayload = (assetType: string): InputViewFunctionData => {
  if (isFungibleAssetReference(assetType)) {
    return {
      function: '0x1::fungible_asset::decimals',
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [assetType],
    }
  }

  return { function: '0x1::coin::decimals', typeArguments: [assetType], functionArguments: [] }
}

export const getBalancePayload = (owner: string, assetType: string): InputViewFunctionData => {
  if (isFungibleAssetReference(assetType)) {
    return {
      function: '0x1::primary_fungible_store::balance',
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [owner, assetType],
    }
  }

  return {
    function: '0x1::coin::balance',
    typeArguments: [assetType],
    functionArguments: [owner],
  }
}

const getEntryFunction = ({ payload }: RawTransaction): EntryFunction => {
  if (payload instanceof TransactionPayloadEntryFunction) return payload.entryFunction

  if (
    payload instanceof TransactionInnerPayloadV1 &&
    payload.executable instanceof TransactionExecutableEntryFunction
  ) {
    // a multisig inner payload executes as the multisig account, which unwrapping would drop
    if (
      payload.extra_config instanceof TransactionExtraConfigV1 &&
      payload.extra_config.multisigAddress
    ) {
      throw new Error('transaction is a multisig entry function call')
    }

    return payload.executable.entryFunction
  }

  throw new Error('transaction is not an entry function call')
}

// Keeps only the entry function call as a standard payload; sender, gas, expiry and any orderless nonce are set again at signing
export const extractEntryFunctionPayload = (rawTransaction: string): string => {
  const entryFunction = getEntryFunction(
    RawTransaction.deserialize(new Deserializer(Hex.fromHexInput(rawTransaction).toUint8Array())),
  )

  return new TransactionPayloadEntryFunction(entryFunction).bcsToHex().toString()
}
