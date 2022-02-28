import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { FaCalendarAlt } from 'react-icons/fa'

export const DatePicker = () => (
  <InputGroup>
    <InputLeftElement pointerEvents='none' color={useColorModeValue('blue.300', 'blue.200')}>
      <FaCalendarAlt />
    </InputLeftElement>
    <Input
      pl={10}
      placeholder='00/00/0000'
      bg={useColorModeValue('gray.300', 'gray.750')}
      color={useColorModeValue('blue.300', 'blue.200')}
    />
  </InputGroup>
)
