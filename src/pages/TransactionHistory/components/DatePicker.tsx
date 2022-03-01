import {
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  OmitCommonProps,
  useColorModeValue
} from '@chakra-ui/react'
import { DetailedHTMLProps, InputHTMLAttributes } from 'react'
import { FaCalendarAlt } from 'react-icons/fa'

export const DatePicker = (
  props: JSX.IntrinsicAttributes &
    OmitCommonProps<
      DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
      keyof InputProps
    > &
    InputProps & { as?: 'input' | undefined }
) => (
  <InputGroup>
    <InputLeftElement pointerEvents='none' color={useColorModeValue('blue.300', 'blue.200')}>
      <FaCalendarAlt />
    </InputLeftElement>
    <Input
      pl={10}
      placeholder='00/00/0000'
      bg={useColorModeValue('gray.300', 'gray.750')}
      color={useColorModeValue('blue.300', 'blue.200')}
      {...props}
    />
  </InputGroup>
)
