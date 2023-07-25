import { SearchIcon } from '@chakra-ui/icons'
import { Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { forwardRef, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

const InputGroupMargin = [2, 3, 6]

export const TransactionHistorySearch = forwardRef<
  HTMLInputElement,
  { handleInputChange: Function }
>(({ handleInputChange }, ref) => {
  const translate = useTranslate()
  const handleOnChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    e => handleInputChange(e.target.value),
    [handleInputChange],
  )
  return (
    <InputGroup mr={InputGroupMargin}>
      <InputLeftElement pointerEvents='none'>
        <SearchIcon color={useColorModeValue('gray.300', 'gray.750')} />
      </InputLeftElement>
      <Input
        onChange={handleOnChange}
        type='text'
        placeholder={translate('common.search')}
        pl={10}
        variant='filled'
        ref={ref}
      />
    </InputGroup>
  )
})
