import { SearchIcon } from '@chakra-ui/icons'
import type { InputGroupProps, InputProps } from '@chakra-ui/react'
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react'
import { debounce } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

const faTimes = <FaTimes />

type GlobalFilterProps = {
  setSearchQuery: (filterValue: any) => void
  searchQuery: any
  inputGroupProps?: InputGroupProps
} & InputProps
export const GlobalFilter: React.FC<GlobalFilterProps> = props => {
  const {
    setSearchQuery,
    searchQuery = '',
    inputGroupProps,
    inputProps,
  } = useMemo(() => {
    const { setSearchQuery, searchQuery, inputGroupProps, ...inputProps } = props

    return {
      setSearchQuery,
      searchQuery,
      inputGroupProps,
      inputProps,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))
  const translate = useTranslate()
  const [value, setValue] = useState(searchQuery)
  const [loading, setLoading] = useState(false)

  const handleDebounce = useCallback(
    (value: string) => {
      setSearchQuery(value)
      setLoading(false)
    },
    [setSearchQuery],
  )
  const debounceFnc = useMemo(() => debounce(handleDebounce, 250), [handleDebounce])

  const handleChange = useCallback(
    (value: string) => {
      setLoading(true)
      setValue(value)
      debounceFnc(value)
    },
    [debounceFnc],
  )
  const handleReset = useCallback(() => {
    setValue('')
    handleDebounce('')
  }, [handleDebounce])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value),
    [handleChange],
  )

  return (
    <InputGroup size='md' {...inputGroupProps}>
      {/* Override zIndex to prevent element displaying on overlay components */}
      <InputLeftElement pointerEvents='none' zIndex={1}>
        <SearchIcon color='text.subtlest' />
      </InputLeftElement>
      <Input
        variant='filled'
        placeholder='Search'
        onChange={handleInputChange}
        value={value}
        {...inputProps}
      />
      {value && (
        <InputRightElement>
          <IconButton
            isRound
            size='xs'
            variant='ghost'
            icon={faTimes}
            aria-label={translate('common.clear')}
            isLoading={loading}
            onClick={handleReset}
          />
        </InputRightElement>
      )}
    </InputGroup>
  )
}
