import { BellIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Circle,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import { MdPending, MdPendingActions } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

export const PendingTxWindow = () => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, 10))
  return (
    <Popover placement='bottom-start'>
      <PopoverTrigger>
        <Box position='relative'>
          <IconButton aria-label='Pending Transactions' icon={<MdPending />} />
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
      </PopoverTrigger>
      <PopoverContent minHeight='60vh' maxHeight='60vh' overflow='auto'>
        <PopoverBody px={0}>
          <TransactionsGroupByDate txIds={recentTxIds} useCompactMode />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
