import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { AddressBookState } from '@/state/slices/addressBookSlice/addressBookSlice'
import { initialState } from '@/state/slices/addressBookSlice/addressBookSlice'

export const clearAddressBook = (_state: AddressBookState): AddressBookState & PersistPartial => {
  // Migration to clear addressBook state
  return initialState as AddressBookState & PersistPartial
}
