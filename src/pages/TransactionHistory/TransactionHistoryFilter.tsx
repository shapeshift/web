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
  useColorModeValue,
  useOutsideClick,
} from '@chakra-ui/react'
import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { IoOptionsOutline } from 'react-icons/io5'
import { TbFilter } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { DatePicker } from './components/DatePicker/DatePicker'

import type { Option } from '@/components/FilterGroup'
import { FilterGroup } from '@/components/FilterGroup'
import { Text } from '@/components/Text'

const customRangeOption: string = 'customRange'
const hoverProp = { bg: 'transparent' }
const closeIcon = <CloseIcon w={3} h={3} />

const filterIcon = <TbFilter />

export enum FilterFormFields {
  FromDate = 'fromDate',
  ToDate = 'toDate',
  DayRange = 'dayRange',
  Types = 'types',
}

type TransactionHistoryFilterProps = {
  setFilters: Function
  resetFilters: Function
  hasAppliedFilter?: boolean
  isCompact?: boolean
}

const ioOptionsOutlineIcon = <IoOptionsOutline size='1.5em' />

export const TransactionHistoryFilter = memo(
  ({
    setFilters,
    resetFilters,
    hasAppliedFilter = false,
    isCompact = false,
  }: TransactionHistoryFilterProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const popoverRef = useRef(null)
    /**
     * Popover default outside click detector didn't play well with
     * react-datepicker, but making it controlled and
     * passing a new detector to popover content,
     * solved the problem.
     */
    useOutsideClick({
      ref: popoverRef,
      handler: e => {
        const target = e.target as HTMLElement
        if (!target?.className?.includes('react-datepicker')) {
          setIsOpen(false)
        }
      },
    })
    const translate = useTranslate()
    const { control, handleSubmit, watch, reset } = useForm({ mode: 'onChange' })
    const onSubmit = useCallback(
      (values: FieldValues) => {
        const { fromDate, toDate, dayRange, types } = values
        let filterSet = {
          fromDate,
          toDate,
          dayRange,
          types,
        }
        if (!!dayRange && dayRange !== customRangeOption) {
          const today = dayjs().endOf('day')
          filterSet.fromDate = today.subtract(dayRange, 'day').unix()
          filterSet.toDate = today.unix()
        } else if (dayRange === customRangeOption) {
          if (fromDate) {
            filterSet.fromDate = dayjs(fromDate).startOf('day').unix()
          }
          if (toDate) {
            filterSet.toDate = dayjs(toDate).endOf('day').unix()
          }
        }
        setFilters(filterSet)
      },
      [setFilters],
    )
    const popoverContentBg = useColorModeValue('gray.100', 'gray.700')
    const onResetFilters = useCallback(() => {
      reset()
      resetFilters()
    }, [reset, resetFilters])
    const dayRangeSelectedOption = watch(FilterFormFields.DayRange)
    const RangeCustomComponent = useCallback(() => {
      return dayRangeSelectedOption === customRangeOption ? (
        <HStack px={4} my={2} alignItems='center' mx={-4}>
          <DatePicker name={FilterFormFields.FromDate} control={control} withPortal />
          <Text
            fontWeight='300'
            px={1}
            color={'text.subtle'}
            translation='transactionHistory.filters.to'
          />
          <DatePicker name={FilterFormFields.ToDate} control={control} withPortal />
        </HStack>
      ) : null
    }, [control, dayRangeSelectedOption])

    const handleClose = useCallback(() => setIsOpen(false), [setIsOpen])
    const handleToggle = useCallback(() => setIsOpen(state => !state), [setIsOpen])

    const handleResetStopPagination: React.MouseEventHandler<HTMLButtonElement> = useCallback(
      e => {
        e.stopPropagation()
        onResetFilters()
      },
      [onResetFilters],
    )

    const dayRangeOptions: Option[] = useMemo(
      () => [
        ['transactionHistory.filters.custom', customRangeOption, <RangeCustomComponent />],
        ['transactionHistory.filters.10days', '10'],
        ['transactionHistory.filters.30days', '30'],
        ['transactionHistory.filters.90days', '90'],
      ],
      [RangeCustomComponent],
    )

    const categoriesOptions: Option[] = useMemo(
      () => [
        ['transactionHistory.filters.send', TransferType.Send],
        ['transactionHistory.filters.trade', TradeType.Trade],
        ['transactionHistory.filters.receive', TransferType.Receive],
      ],
      [],
    )

    const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

    return (
      <Popover closeOnBlur={false} isOpen={isOpen}>
        <>
          <PopoverTrigger>
            {isCompact ? (
              <IconButton
                aria-label={translate('transactionHistory.filter')}
                icon={filterIcon}
                size='md'
                onClick={handleToggle}
              />
            ) : (
              <ButtonGroup isAttached variant='ghost-filled'>
                <Button
                  colorScheme='blue'
                  variant='ghost-filled'
                  leftIcon={ioOptionsOutlineIcon}
                  onClick={handleToggle}
                >
                  <Text translation='transactionHistory.filter' />
                </Button>
                <IconButton
                  variant='ghost-filled'
                  colorScheme='blue'
                  aria-label={translate('transactionHistory.filters.resetFilters')}
                  icon={closeIcon}
                  onClick={handleResetStopPagination}
                />
              </ButtonGroup>
            )}
          </PopoverTrigger>
          <PopoverContent
            w='360px'
            maxWidth='100%'
            bg={popoverContentBg}
            boxShadow='lg'
            ref={popoverRef}
          >
            <PopoverBody p={0}>
              <Flex p={2} justifyContent='space-between' alignItems='center'>
                <Text px={2} translation='transactionHistory.filter' />
                <Button
                  variant='ghost'
                  p={2}
                  isDisabled={!hasAppliedFilter}
                  colorScheme='blue'
                  _hover={hoverProp}
                  onClick={onResetFilters}
                >
                  <Text translation='transactionHistory.filters.resetFilters' />
                </Button>
              </Flex>
              <Divider />
              <form onSubmit={handleFormSubmit}>
                <FilterGroup
                  name={FilterFormFields.DayRange}
                  control={control}
                  title='transactionHistory.filters.dayRange'
                  options={dayRangeOptions}
                />
                <Divider />
                <FilterGroup
                  name={FilterFormFields.Types}
                  control={control}
                  title='transactionHistory.filters.categories'
                  allowMultipleOptions
                  options={categoriesOptions}
                />
                <Flex justifyContent='center' alignItems='center'>
                  <Button colorScheme='blue' my={4} type='submit' onClick={handleClose}>
                    <Text translation='transactionHistory.filters.apply' />
                  </Button>
                </Flex>
              </form>
            </PopoverBody>
          </PopoverContent>
        </>
      </Popover>
    )
  },
)
