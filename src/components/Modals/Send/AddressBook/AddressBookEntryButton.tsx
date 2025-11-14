import { Avatar, Box, Button, HStack, Icon, Text as CText, VStack } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { FaTrash } from 'react-icons/fa'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'

type AddressBookEntryButtonProps = {
  avatarUrl: string
  label: string
  address: string
  entryKey: string
  onSelect: (address: string) => void
  onDelete: (key: string) => void
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

const AddressBookEntryButtonComponent = ({
  avatarUrl,
  label,
  address,
  entryKey,
  onSelect,
  onDelete,
}: AddressBookEntryButtonProps) => {
  const handleClick = useCallback(() => onSelect(address), [onSelect, address])
  const handleDelete = useCallback(
    (key: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      e.preventDefault()
      onDelete(key)
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
            {label}
          </CText>
          <MiddleEllipsis fontSize='sm' color='text.subtle' noOfLines={1} value={address} />
        </VStack>
      </HStack>
      <Button size='sm' onClick={handleDelete(entryKey)} sx={deleteButtonSx} flexShrink={0}>
        <Icon as={FaTrash} boxSize={4} />
      </Button>
    </Box>
  )
}

// Memoize to prevent re-renders when props haven't changed
export const AddressBookEntryButton = memo(AddressBookEntryButtonComponent)
