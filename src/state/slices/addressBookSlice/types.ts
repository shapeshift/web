import type { AccountId } from '@shapeshiftoss/caip'

export type AddressBookEntry = {
  label: string
  address: string
  isExternal: boolean
  isInternal: boolean
  accountId: AccountId
}
