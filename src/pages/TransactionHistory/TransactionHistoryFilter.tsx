import { CloseIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  Divider,
  Flex,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useColorModeValue
} from '@chakra-ui/react'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { IoOptionsOutline } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import { DatePicker } from './components/DatePicker'
import { FilterGroup } from './components/FilterGroup'

export enum FilterFormFields {
  FromDate = 'fromDate',
  ToDate = 'toDate',
  DayRange = 'dayRange',
  Types = 'types'
}

export type FilterFormFieldsType = {
  [FilterFormFields.FromDate]: string
  [FilterFormFields.ToDate]: string
  [FilterFormFields.DayRange]: string
  [FilterFormFields.Types]: string[]
}

type TransactionHistoryFilterProps = {
  setFilters: Function
  resetFilters: Function
  hasAppliedFilter?: boolean
}

export const TransactionHistoryFilter = ({
  setFilters,
  resetFilters,
  hasAppliedFilter = false
}: TransactionHistoryFilterProps) => {
  const translate = useTranslate()
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting }
  } = useForm({ mode: 'onChange' })
  const onSubmit = (values: FieldValues) => {
    const { fromDate, toDate, dayRange, types } = values
    let filterSet = {
      fromDate,
      toDate,
      dayRange,
      types
    }
    if (!!dayRange) {
      const today = dayjs().endOf('day')
      filterSet.fromDate = today.subtract(dayRange, 'day').unix()
      filterSet.toDate = today.unix()
    }
    if (fromDate) {
      filterSet.fromDate = dayjs(fromDate, 'YYYY-MM-DD').startOf('day').unix()
    }
    if (toDate) {
      filterSet.toDate = dayjs(toDate, 'YYYY-MM-DD').endOf('day').unix()
    }
    setFilters(filterSet)
  }
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && name === FilterFormFields.DayRange && !!value) {
        const [fromDate, toDate] = getValues([FilterFormFields.FromDate, FilterFormFields.ToDate])
        if (fromDate || toDate) {
          setValue(FilterFormFields.FromDate, '')
          setValue(FilterFormFields.ToDate, '')
        }
      }
      if (
        type === 'change' &&
        (name === FilterFormFields.FromDate || name === FilterFormFields.ToDate) &&
        !!value
      ) {
        const dayRange = getValues(FilterFormFields.DayRange)
        if (dayRange) {
          setValue(FilterFormFields.DayRange, '')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [getValues, setValue, watch])
  const popoverContentBg = useColorModeValue('gray.100', 'gray.700')
  const onResetFilters = () => {
    reset()
    resetFilters()
  }
  return (
    <Popover size='xl'>
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <ButtonGroup isAttached variant='ghost-filled'>
              <Button
                colorScheme='blue'
                variant='ghost-filled'
                leftIcon={<IoOptionsOutline size='1.5em' />}
              >
                <Text translation='transactionHistory.filter' />
              </Button>
              <IconButton
                isDisabled={!hasAppliedFilter}
                variant='ghost-filled'
                colorScheme='blue'
                aria-label={translate('transactionHistory.filters.resetFilters')}
                icon={<CloseIcon w={3} h={3} />}
                onClick={e => {
                  e.stopPropagation()
                  onResetFilters()
                }}
              />
            </ButtonGroup>
          </PopoverTrigger>
          <PopoverContent bg={popoverContentBg} boxShadow='lg'>
            <PopoverBody p={0}>
              <Flex px={2} justifyContent='space-between' alignItems='center'>
                <Text px={2} translation='transactionHistory.filter' />
                <Button
                  variant='ghost'
                  p={2}
                  isDisabled={!hasAppliedFilter}
                  colorScheme='blue'
                  _hover={{ bg: 'transparent' }}
                  onClick={() => onResetFilters()}
                >
                  <Text translation='transactionHistory.filters.resetFilters' />
                </Button>
              </Flex>
              <form onSubmit={handleSubmit(onSubmit)}>
                <HStack px={4} my={2} alignItems='center'>
                  <DatePicker name={FilterFormFields.FromDate} control={control} />
                  <Text
                    fontWeight='300'
                    px={3}
                    color={'gray.500'}
                    translation='transactionHistory.filters.to'
                  />
                  <DatePicker name={FilterFormFields.ToDate} control={control} />
                </HStack>
                <FilterGroup
                  name={FilterFormFields.DayRange}
                  control={control}
                  title='transactionHistory.filters.dayRange'
                  options={[
                    ['transactionHistory.filters.10days', '10'],
                    ['transactionHistory.filters.30days', '30'],
                    ['transactionHistory.filters.90days', '90']
                  ]}
                />
                <Divider />
                <FilterGroup
                  name={FilterFormFields.Types}
                  control={control}
                  title='transactionHistory.filters.categories'
                  allowMultipleOptions
                  options={[
                    ['transactionHistory.filters.sent', TxType.Send],
                    ['transactionHistory.filters.trade', TradeType.Trade],
                    ['transactionHistory.filters.received', TxType.Receive]
                  ]}
                />
                <Flex justifyContent='center' alignItems='center'>
                  <Button
                    colorScheme='blue'
                    my={4}
                    isLoading={isSubmitting}
                    type='submit'
                    onClick={onClose}
                  >
                    <Text translation='transactionHistory.filters.apply' />
                  </Button>
                </Flex>
              </form>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}
