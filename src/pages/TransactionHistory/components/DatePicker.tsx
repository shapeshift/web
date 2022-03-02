import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { Control, useController } from 'react-hook-form'
import { FaCalendarAlt } from 'react-icons/fa'

export const DatePicker = ({ control, name }: { control: Control; name: string }) => {
  const {
    field: { onChange, value }
  } = useController({ control, name })
  return (
    <InputGroup>
      <InputLeftElement pointerEvents='none' color={useColorModeValue('blue.300', 'blue.200')}>
        <FaCalendarAlt />
      </InputLeftElement>
      <Input
        pl={10}
        placeholder='00/00/0000'
        bg={useColorModeValue('gray.300', 'gray.750')}
        color={useColorModeValue('blue.300', 'blue.200')}
        name={name}
        value={value || ''}
        onChange={onChange}
        type='date'
      />
    </InputGroup>
  )
}
