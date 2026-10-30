import type { EntryFunctionABI } from '@aptos-labs/ts-sdk'
import { parseTypeTag, TypeTagAddress, TypeTagU64 } from '@aptos-labs/ts-sdk'

export const APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'

export const FEE_STATEMENT_EVENT_TYPE = '0x1::transaction_fee::FeeStatement'

export const INDEXER_PAGE_LIMIT = 100

export const SIMULATED_TRANSFER_VALUE = '1'

// the sdk default of 20s starts at build, so it can run out while a slow signer is confirming
export const TX_EXPIRY_SECS = 300

export const COIN_TRANSFER_FUNCTIONS = [
  '0x1::aptos_account::transfer',
  '0x1::aptos_account::transfer_coins',
  '0x1::coin::transfer',
]

export const FA_TRANSFER_FUNCTIONS = [
  '0x1::primary_fungible_store::transfer',
  '0x1::aptos_account::transfer_fungible_assets',
]

// local abis (mirroring the sdk's transfer helpers) skip a remote abi fetch per build
export const COIN_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [new TypeTagAddress(), new TypeTagU64()],
}

export const FA_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [parseTypeTag('0x1::object::Object'), new TypeTagAddress(), new TypeTagU64()],
}
