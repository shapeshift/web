import { Box, HStack, Icon, Text as CText, useDisclosure, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { FaRegAddressBook } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SendFormFields } from '../SendCommon'

import { AddressBookEntryButton } from '@/components/Modals/Send/AddressBook/AddressBookEntryButton'
import { ConfirmDelete } from '@/components/Modals/Send/AddressBook/ConfirmDelete'
import { Text } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { addressBookSlice } from '@/state/slices/addressBookSlice/addressBookSlice'
import {
  selectAddressBookEntriesByChainId,
  selectAddressBookEntriesBySearchQuery,
} from '@/state/slices/addressBookSlice/selectors'
import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

type AddressBookProps = {
  chainId?: ChainId
  onSelectEntry: (address: string) => void
  emptyMessage?: string
}

const addressBookMaxHeight = {
  base: 'auto',
  md: '200px',
}

export const AddressBook = ({
  chainId,
  onSelectEntry,
  emptyMessage = 'modals.send.noEntries',
}: AddressBookProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const {
    control,
    formState: { errors },
  } = useFormContext()
  const { isOpen, onClose, onOpen } = useDisclosure()
  const [selectedDeleteEntry, setSelectedDeleteEntry] = useState<AddressBookEntry | null>(null)

  const addressError = errors[SendFormFields.Input]?.message ?? null

  const input = useWatch({
    control,
    name: SendFormFields.Input,
  }) as string

  const addressBookEntriesFilter = useMemo(() => ({ chainId }), [chainId])
  const addressBookEntries = useAppSelector(state =>
    selectAddressBookEntriesByChainId(state, addressBookEntriesFilter),
  )

  const selectedEntry = useMemo(() => {
    if (!input) return undefined
    return addressBookEntries?.find(entry => entry.isExternal && entry.address === input)
  }, [addressBookEntries, input])

  const addressBookSearchEntriesFilter = useMemo(
    () => ({ chainId, searchQuery: input }),
    [chainId, input],
  )

  const addressBookSearchEntries = useAppSelector(state =>
    selectAddressBookEntriesBySearchQuery(state, addressBookSearchEntriesFilter),
  )

  const handleDelete = useCallback(
    (entry: AddressBookEntry) => () => {
      dispatch(addressBookSlice.actions.deleteAddress(entry))
    },
    [dispatch],
  )

  const handleDeleteConfirm = useCallback(
    (selectedEntry: AddressBookEntry) => () => {
      setSelectedDeleteEntry(selectedEntry)
      onOpen()
    },
    [onOpen],
  )

  const entries = useMemo(() => {
    if (selectedEntry || !input || (input && !addressError)) return addressBookEntries

    return addressBookSearchEntries
  }, [selectedEntry, addressBookEntries, addressBookSearchEntries, input, addressError])

  const entryAvatars = useMemo(() => {
    return entries?.reduce(
      (acc, entry) => {
        acc[entry.address] = makeBlockiesUrl(entry.address)
        return acc
      },
      {} as Record<string, string>,
    )
  }, [entries])

  const addressBookButtons = useMemo(() => {
    if (entries?.length === 0)
      return <Text translation={emptyMessage} size='xs' mx={2} color='text.subtle' />

    return entries?.map(entry => {
      const entryKey = toAccountId({ chainId: entry.chainId, account: entry.address })

      return (
        <AddressBookEntryButton
          key={entryKey}
          avatarUrl={entryAvatars?.[entry.address] ?? ''}
          label={entry.label}
          address={entry.address}
          entryKey={entryKey}
          onSelect={onSelectEntry}
          onDelete={handleDeleteConfirm(entry)}
        />
      )
    })
  }, [entries, entryAvatars, handleDeleteConfirm, onSelectEntry, emptyMessage])

  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <Icon as={FaRegAddressBook} boxSize={4} color='text.subtle' />
        <CText fontSize='sm' fontWeight='medium' color='text.subtle'>
          {translate('modals.send.addressBook')}
        </CText>
      </HStack>

      <Box
        maxHeight={addressBookMaxHeight}
        overflowY='auto'
        mx={-4}
        className='scroll-container'
        px={2}
      >
        <VStack spacing={3} align='stretch'>
          {addressBookButtons}
        </VStack>
      </Box>
      {selectedDeleteEntry && (
        <ConfirmDelete
          isOpen={isOpen}
          onDelete={handleDelete(selectedDeleteEntry)}
          onClose={onClose}
          entryName={selectedDeleteEntry.label}
        />
      )}
    </Box>
  )
}
