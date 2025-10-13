import {
	Avatar,
	Box,
	Text as CText,
	HStack,
	Icon,
	useColorModeValue,
	VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { FaRegAddressBook } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { selectAddressBookEntriesByChainId } from '@/state/slices/addressBookSlice/selectors'
import { useAppSelector } from '@/state/store'

export type AddressBookEntry = {
  id: string
  name: string
  address: string
}

type AddressBookEntryButtonProps = {
  entry: AddressBookEntry
  onSelect: (address: string) => void
}

const AddressBookEntryButton = ({ entry, onSelect }: AddressBookEntryButtonProps) => {
  const avatarUrl = useMemo(() => makeBlockiesUrl(entry.address), [entry.address])
  const handleClick = useCallback(() => onSelect(entry.address), [onSelect, entry.address])
  const shortAddress = useMemo(
    () => `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`,
    [entry.address],
  )
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      borderWidth={1}
      borderColor={borderColor}
      borderRadius='lg'
      p={3}
      cursor='pointer'
      onClick={handleClick}
      transition='all 0.2s'
    >
      <HStack spacing={3} align='center' width='full'>
        <Avatar src={avatarUrl} size='md' />
        <VStack align='start' spacing={0} flex={1}>
          <CText fontSize='md' fontWeight='semibold' color='text.primary'>
            {entry.name}
          </CText>
          <CText fontSize='sm' color='text.subtle' noOfLines={1}>
            {shortAddress}
          </CText>
        </VStack>
      </HStack>
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

  const addressBookEntries = useAppSelector(state =>
    chainId ? selectAddressBookEntriesByChainId(state, chainId) : [],
  )

  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <Icon as={FaRegAddressBook} boxSize={4} color='text.subtle' />
        <CText fontSize='sm' fontWeight='medium' color='text.subtle'>
          {translate('modals.send.addressBook')}
        </CText>
      </HStack>

      <VStack spacing={3} align='stretch'>
        {addressBookEntries.length === 0 ? (
          <Text translation={emptyMessage} size='xs' color='text.subtle' />
        ) : (
          addressBookEntries.map(entry => (
            <AddressBookEntryButton key={entry.id} entry={entry} onSelect={onSelectEntry} />
          ))
        )}
      </VStack>
    </Box>
  )
}
