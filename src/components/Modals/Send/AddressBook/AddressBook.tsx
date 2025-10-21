import {
  Avatar,
  Box,
  Button,
  HStack,
  Icon,
  Text as CText,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { get, useFormContext, useWatch } from 'react-hook-form'
import { FaRegAddressBook, FaTrash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SendFormFields } from '../SendCommon'

import { ConfirmDelete } from '@/components/Modals/Send/AddressBook/ConfirmDelete'
import { Text } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { addressBookSlice } from '@/state/slices/addressBookSlice/addressBookSlice'
import {
  selectAddressBookEntriesByChainNamespace,
  selectAddressBookEntriesBySearchQuery,
} from '@/state/slices/addressBookSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type AddressBookEntry = {
  id: string
  name: string
  address: string
}

type AddressBookEntryButtonProps = {
  entry: AddressBookEntry
  onSelect: (address: string) => void
  onDelete: (id: string) => void
}

const addressSx = {
  _hover: {
    background: 'background.surface.raised.base',
  },
}

const deleteButtonSx = {
  svg: {
    width: '12px',
    height: '12px',
  },
}

const AddressBookEntryButton = ({ entry, onSelect, onDelete }: AddressBookEntryButtonProps) => {
  const avatarUrl = useMemo(() => makeBlockiesUrl(entry.address), [entry.address])
  const handleClick = useCallback(() => onSelect(entry.address), [onSelect, entry.address])
  const shortAddress = useMemo(
    () => `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`,
    [entry.address],
  )

  const handleDelete = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      e.preventDefault()
      onDelete(id)
    },
    [onDelete],
  )

  return (
    <Box
      cursor='pointer'
      alignItems='center'
      justifyContent='space-between'
      display='flex'
      overflow='hidden'
      width='full'
    >
      <HStack
        px={2}
        py={1}
        borderRadius='lg'
        spacing={3}
        align='center'
        flex={1}
        minWidth={0}
        onClick={handleClick}
        transition='all 0.2s'
        sx={addressSx}
        me={2}
      >
        <Avatar src={avatarUrl} size='sm' flexShrink={0} />
        <VStack align='start' spacing={0} flex={1} minWidth={0}>
          <CText fontSize='md' fontWeight='semibold' color='text.primary' lineHeight={1}>
            {entry.name}
          </CText>
          <CText fontSize='sm' color='text.subtle' noOfLines={1}>
            {shortAddress}
          </CText>
        </VStack>
      </HStack>
      <Button size='sm' onClick={handleDelete(entry.id)} sx={deleteButtonSx} flexShrink={0}>
        <Icon as={FaTrash} boxSize={4} />
      </Button>
    </Box>
  )
}

type AddressBookProps = {
  chainId?: ChainId
  onSelectEntry: (address: string) => void
  emptyMessage?: string
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
  const { isOpen, onClose, onOpen } = useDisclosure({
    defaultIsOpen: false,
  })
  const [selectedDeleteEntry, setSelectedDeleteEntry] = useState<AddressBookEntry | null>(null)
  const addressBookEntries = useAppSelector(state =>
    selectAddressBookEntriesByChainNamespace(state, chainId ?? ''),
  )

  const address = useWatch({
    control,
    name: SendFormFields.To,
  }) as string
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  const input = useWatch({
    control,
    name: SendFormFields.Input,
  }) as string

  const selectedEntry = useMemo(() => {
    return addressBookEntries.find(entry => entry.address === input)
  }, [addressBookEntries, input])

  const searchQuery = useMemo(() => input ?? '', [input])

  const addressBookSearchEntries = useAppSelector(state =>
    selectAddressBookEntriesBySearchQuery(state, {
      chainId: chainId ?? '',
      searchQuery,
    }),
  )

  const handleDelete = useCallback(
    (id: string) => () => {
      dispatch(addressBookSlice.actions.deleteAddress(id))
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
    if (selectedEntry || (address && !addressError)) return addressBookEntries

    return addressBookSearchEntries
  }, [selectedEntry, addressBookEntries, addressBookSearchEntries, address, addressError])

  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <Icon as={FaRegAddressBook} boxSize={4} color='text.subtle' />
        <CText fontSize='sm' fontWeight='medium' color='text.subtle'>
          {translate('modals.send.addressBook')}
        </CText>
      </HStack>

      <Box maxHeight='200px' overflowY='auto' mx={-4} className='scroll-container' px={2}>
        <VStack spacing={3} align='stretch'>
          {entries.length === 0 ? (
            <Text translation={emptyMessage} size='xs' mx={2} color='text.subtle' />
          ) : (
            entries.map(entry => (
              <AddressBookEntryButton
                key={entry.id}
                entry={entry}
                onSelect={onSelectEntry}
                onDelete={handleDeleteConfirm(entry)}
              />
            ))
          )}
        </VStack>
      </Box>
      {selectedDeleteEntry && (
        <ConfirmDelete
          isOpen={isOpen}
          onDelete={handleDelete(selectedDeleteEntry?.id)}
          onClose={onClose}
          entryName={selectedDeleteEntry?.name}
        />
      )}
    </Box>
  )
}
