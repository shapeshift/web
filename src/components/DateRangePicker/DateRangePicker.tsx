import 'react-day-picker/style.css'
import './DateRangePicker.css'

import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useColorModeValue,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import type { DateRange, DayPickerProps } from 'react-day-picker'
import { DayPicker } from 'react-day-picker'
import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { FaCalendarAlt } from 'react-icons/fa'

type DateRangePickerProps = {
  control: Control
  name: string
  mode?: 'single' | 'range'
  placeholder?: string
}

const calendarIcon = <FaCalendarAlt />
const chevronLeftIcon = <ChevronLeftIcon />
const chevronRightIcon = <ChevronRightIcon />

export const DateRangePicker = ({
  control,
  name,
  mode = 'single',
  placeholder = 'MM/DD/YYYY',
}: DateRangePickerProps) => {
  const {
    field: { onChange, value },
  } = useController({ control, name })

  const [isOpen, setIsOpen] = useState(false)

  const inputGroupClassName = useColorModeValue('light-theme', 'dark-theme')
  const inputLeftElementColor = useColorModeValue('blue.300', 'blue.200')
  const inputColor = useColorModeValue('blue.300', 'blue.200')
  const inputBg = useColorModeValue('gray.300', 'gray.750')
  const popoverContentBg = useColorModeValue('white', 'gray.700')
  const navIconColor = useColorModeValue('gray.500', 'darkNeutral.300')

  const customComponents: DayPickerProps['components'] = useMemo(
    () => ({
      Nav: ({ onPreviousClick, onNextClick, previousMonth, nextMonth }) => (
        <>
          <IconButton
            aria-label='Previous month'
            icon={chevronLeftIcon}
            onClick={onPreviousClick}
            disabled={!previousMonth}
            variant='ghost'
            colorScheme='gray'
            size='sm'
            color={navIconColor}
          />
          <IconButton
            aria-label='Next month'
            icon={chevronRightIcon}
            onClick={onNextClick}
            disabled={!nextMonth}
            variant='ghost'
            colorScheme='gray'
            size='sm'
            color={navIconColor}
          />
        </>
      ),
    }),
    [navIconColor],
  )

  const handleDaySelect = useCallback(
    (selected: Date | DateRange | undefined) => {
      onChange(selected)
      if (mode === 'single' && selected) {
        setIsOpen(false)
      } else if (
        mode === 'range' &&
        selected &&
        (selected as DateRange).from &&
        (selected as DateRange).to
      ) {
        setIsOpen(false)
      }
    },
    [onChange, mode],
  )

  const displayValue = useMemo(() => {
    if (!value) return ''

    if (mode === 'single') {
      return format(value as Date, 'MM/dd/yyyy')
    }

    const range = value as DateRange
    if (range.from && range.to) {
      return `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`
    } else if (range.from) {
      return format(range.from, 'MM/dd/yyyy')
    }

    return ''
  }, [value, mode])

  const handleInputClick = useCallback(() => setIsOpen(true), [])
  const handlePopoverClose = useCallback(() => setIsOpen(false), [])

  return (
    <Popover isOpen={isOpen} onClose={handlePopoverClose} placement='bottom-start'>
      <PopoverTrigger>
        <InputGroup className={inputGroupClassName}>
          <InputLeftElement pointerEvents='none' color={inputLeftElementColor}>
            {calendarIcon}
          </InputLeftElement>
          <Input
            value={displayValue}
            onClick={handleInputClick}
            readOnly
            bg={inputBg}
            color={inputColor}
            placeholder={placeholder}
            cursor='pointer'
          />
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent bg={popoverContentBg} boxShadow='lg' width='auto'>
        <PopoverBody p={0}>
          {mode === 'single' ? (
            <DayPicker
              mode='single'
              selected={value as Date}
              onSelect={handleDaySelect}
              components={customComponents}
              navLayout='around'
            />
          ) : (
            <DayPicker
              mode='range'
              selected={value as DateRange}
              onSelect={handleDaySelect}
              components={customComponents}
              navLayout='around'
            />
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
