import type { AccountId, ChainId } from '@shapeshiftoss/caip'

export type AddressBookEntry = {
  label: string
  address: string
  chainId: ChainId
} & (
  | {
      isExternal: true
      isInternal: false
    }
  | {
      isInternal: true
      isExternal: false
      accountId: AccountId
    }
)
