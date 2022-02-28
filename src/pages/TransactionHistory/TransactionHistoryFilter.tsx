import {
  Button,
  Divider,
  Flex,
  Icon,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useColorModeValue
} from '@chakra-ui/react'
import { IoOptionsOutline } from 'react-icons/io5'
import { Text } from 'components/Text'

import { DatePicker } from './components/DatePicker'
import { FilterGroup } from './components/FilterGroup'

export const TransactionHistoryFilter = () => {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          colorScheme='blue'
          variant='ghost-filled'
          rightIcon={<Icon as={IoOptionsOutline} />}
        >
          <Text translation='transactionHistory.filter' />
        </Button>
      </PopoverTrigger>
      <PopoverContent bg={useColorModeValue('gray.200', 'gray.700')} boxShadow='lg'>
        <PopoverBody p={0}>
          <Flex px={4} justifyContent='space-between' alignItems='center'>
            <Text translation='transactionHistory.filter' />
            <Button variant='ghost' p={2} colorScheme='blue' _hover={{ bg: 'transparent' }}>
              <Text translation='transactionHistory.filters.resetFilters' />
            </Button>
          </Flex>
          <Flex px={4} my={2} alignItems='center'>
            <DatePicker />
            <Text
              fontWeight='300'
              px={3}
              color={'gray.500'}
              translation='transactionHistory.filters.to'
            />
            <DatePicker />
          </Flex>
          <FilterGroup
            title='transactionHistory.filters.dayRange'
            options={[
              'transactionHistory.filters.10days',
              'transactionHistory.filters.30days',
              'transactionHistory.filters.90days'
            ]}
          />
          <Divider />
          <FilterGroup
            title='transactionHistory.filters.categories'
            options={[
              'transactionHistory.filters.sent',
              'transactionHistory.filters.trade',
              'transactionHistory.filters.received'
            ]}
          />
          <Flex justifyContent='center' alignItems='center'>
            <Button colorScheme='blue' my={4}>
              <Text translation='transactionHistory.filters.apply' />
            </Button>
          </Flex>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
