import { SearchIcon } from '@chakra-ui/icons'
import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { forwardRef } from 'react'

export const TransactionHistorySearch = forwardRef<
  HTMLInputElement,
  { handleInputChange: Function }
>(({ handleInputChange }, ref) => {
  return (
    <InputGroup mr={[3, 3, 6]}>
      <InputLeftElement pointerEvents='none'>
        <SearchIcon color={useColorModeValue('gray.300', 'gray.750')} />
      </InputLeftElement>
      <Input
        onChange={e => handleInputChange(e.target.value)}
        type='text'
        placeholder='Search'
        pl={10}
        variant='filled'
        ref={ref}
      />
    </InputGroup>
  )
})
