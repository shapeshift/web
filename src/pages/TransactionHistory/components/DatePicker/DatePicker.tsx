import 'react-datepicker/dist/react-datepicker.css'
import './DatePicker.css'

import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import ReactDatePicker from 'react-datepicker'
import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { FaCalendarAlt } from 'react-icons/fa'

export const DatePicker = ({
  control,
  name,
  withPortal,
}: {
  control: Control
  name: string
  withPortal?: boolean
}) => {
  const {
    field: { onChange, value },
  } = useController({ control, name })

  const inputGroupClassName = useColorModeValue('light-theme', 'dark-theme')
  const inputLeftElementColor = useColorModeValue('blue.300', 'blue.200')
  const inputColor = useColorModeValue('blue.300', 'blue.200')
  const inputBg = useColorModeValue('gray.300', 'gray.750')

  const handleFormatWeekDat = useCallback((day: string) => day.slice(0, 1), [])

  return (
    <InputGroup className={inputGroupClassName}>
      <InputLeftElement pointerEvents='none' color={inputLeftElementColor}>
        <FaCalendarAlt />
      </InputLeftElement>
      <Input
        as={ReactDatePicker}
        selected={value || ''}
        onChange={onChange}
        bg={inputBg}
        color={inputColor}
        name={name}
        placeholderText='00/00/0000'
        autoComplete='off'
        formatWeekDay={handleFormatWeekDat}
        portalId={withPortal ? `date-picker-portal-${name}` : undefined}
        withPortal={!!withPortal}
      />
    </InputGroup>
  )
}
