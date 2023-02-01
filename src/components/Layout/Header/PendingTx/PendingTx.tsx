import { BellIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Circle,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import { useState } from 'react'
import { MdPending, MdPendingActions } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

export const PendingTxWindow = () => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, 10))
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Box position='relative'>
        <IconButton
          aria-label='Pending Transactions'
          icon={<MdPending />}
          onClick={() => setIsOpen(!isOpen)}
        />
        <Circle
          position='absolute'
          size='18px'
          fontSize='12px'
          fontWeight='bold'
          bg='blue.500'
          color='white'
          top='-0.2em'
          right='-0.2em'
        >
          2
        </Circle>
      </Box>
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} size='sm'>
        <DrawerOverlay backdropBlur='10px' />
        <DrawerContent minHeight='100vh' maxHeight='100vh' overflow='auto'>
          <DrawerCloseButton />
          <DrawerHeader>Pending Transactions</DrawerHeader>
          <DrawerBody px={0}>
            <TransactionsGroupByDate txIds={recentTxIds} useCompactMode />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
