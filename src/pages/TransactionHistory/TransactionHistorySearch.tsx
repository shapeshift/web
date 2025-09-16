import { SearchIcon } from '@chakra-ui/icons'
import { Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { forwardRef, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

export const TransactionHistorySearch = forwardRef<
  HTMLInputElement,
  { isCompact?: boolean; handleInputChange: Function }
>(({ isCompact = false, handleInputChange }, ref) => {
  const translate = useTranslate()
  const handleOnChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    e => handleInputChange(e.target.value),
    [handleInputChange],
  )
  const inputGroupMargin = useMemo(() => [2, 3, isCompact ? 1 : 6], [isCompact])
  return (
    <InputGroup mr={inputGroupMargin}>
      <InputLeftElement pointerEvents='none'>
        <SearchIcon color='text.subtlest' />
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
