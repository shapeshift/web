import type { EntryFunctionABI } from '@aptos-labs/ts-sdk'
import { parseTypeTag, TypeTagAddress, TypeTagU64 } from '@aptos-labs/ts-sdk'

export const APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'

export const FEE_STATEMENT_EVENT_TYPE = '0x1::transaction_fee::FeeStatement'

export const FA_DEPOSIT_EVENT_TYPE = '0x1::fungible_asset::Deposit'
export const FA_WITHDRAW_EVENT_TYPE = '0x1::fungible_asset::Withdraw'
export const FA_STORE_DELETION_EVENT_TYPE = '0x1::fungible_asset::FungibleStoreDeletion'
export const COIN_DEPOSIT_EVENT_TYPE = '0x1::coin::CoinDeposit'
export const COIN_WITHDRAW_EVENT_TYPE = '0x1::coin::CoinWithdraw'

export const OBJECT_CORE_RESOURCE_TYPE = '0x1::object::ObjectCore'
export const FUNGIBLE_STORE_RESOURCE_TYPE = '0x1::fungible_asset::FungibleStore'

export const INDEXER_PAGE_LIMIT = 100

// a transient node error (e.g. a 429) shouldn't drop a parsed tx from history
export const PAIRED_COIN_LOOKUP_ATTEMPTS = 3
export const PAIRED_COIN_LOOKUP_RETRY_DELAY_MS = 500

// the sdk default of 20s starts at build, so it can run out while a slow signer is confirming
export const TX_EXPIRY_SECS = 300

// local abis (mirroring the sdk's transfer helpers) skip a remote abi fetch per build
export const COIN_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [new TypeTagAddress(), new TypeTagU64()],
}

export const FA_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [parseTypeTag('0x1::object::Object'), new TypeTagAddress(), new TypeTagU64()],
}
