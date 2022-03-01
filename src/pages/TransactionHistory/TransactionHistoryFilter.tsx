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
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { FieldValues, useForm } from 'react-hook-form'
import { IoOptionsOutline } from 'react-icons/io5'
import { Text } from 'components/Text'

import { DatePicker } from './components/DatePicker'
import { FilterGroup } from './components/FilterGroup'

type TransactionHistoryFilterProps = {
  setFilters: Function
  resetFilters: Function
}

export const TransactionHistoryFilter = ({
  setFilters,
  resetFilters
}: TransactionHistoryFilterProps) => {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting }
  } = useForm({ mode: 'onChange' })
  const onSubmit = (values: FieldValues) => {
    const newFilters = values
    setFilters(newFilters)
  }
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
            <Button
              variant='ghost'
              p={2}
              colorScheme='blue'
              _hover={{ bg: 'transparent' }}
              onClick={e => resetFilters()}
            >
              <Text translation='transactionHistory.filters.resetFilters' />
            </Button>
          </Flex>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Flex px={4} my={2} alignItems='center'>
              <DatePicker {...register('fromDate')} />
              <Text
                fontWeight='300'
                px={3}
                color={'gray.500'}
                translation='transactionHistory.filters.to'
              />
              <DatePicker {...register('fromDate')} />
            </Flex>
            <FilterGroup
              {...register('dayRange')}
              title='transactionHistory.filters.dayRange'
              options={[
                ['transactionHistory.filters.10days', 10],
                ['transactionHistory.filters.30days', 30],
                ['transactionHistory.filters.90days', 90]
              ]}
            />
            <Divider />
            <FilterGroup
              {...register('types')}
              title='transactionHistory.filters.categories'
              allowMultipleOptions
              options={[
                ['transactionHistory.filters.sent', TxType.Send],
                ['transactionHistory.filters.trade', TradeType.Trade],
                ['transactionHistory.filters.received', TxType.Receive]
              ]}
            />
            <Flex justifyContent='center' alignItems='center'>
              <Button colorScheme='blue' my={4} isLoading={isSubmitting} type='submit'>
                <Text translation='transactionHistory.filters.apply' />
              </Button>
            </Flex>
          </form>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
