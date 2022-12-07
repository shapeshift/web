import 'react-datepicker/dist/react-datepicker.css'
import './DatePicker.css'

import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import ReactDatePicker from 'react-datepicker'
import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { FaCalendarAlt } from 'react-icons/fa'

export const DatePicker = ({ control, name }: { control: Control; name: string }) => {
  const {
    field: { onChange, value },
  } = useController({ control, name })
  return (
    <InputGroup className={useColorModeValue('light-theme', 'dark-theme')}>
      <InputLeftElement pointerEvents='none' color={useColorModeValue('blue.300', 'blue.200')}>
        <FaCalendarAlt />
      </InputLeftElement>
      <Input
        as={ReactDatePicker}
        selected={value || ''}
        onChange={onChange}
        bg={useColorModeValue('gray.300', 'gray.750')}
        color={useColorModeValue('blue.300', 'blue.200')}
        name={name}
        placeholderText='00/00/0000'
        autoComplete='off'
        formatWeekDay={(day: string) => day.slice(0, 1)}
      />
    </InputGroup>
  )
}
