import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { FormEvent } from 'react'
import { useForm } from 'react-hook-form'

export const TransactionHistorySearch = () => {
  const { register } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: ''
    }
  })
  return (
    <Box
      as='form'
      mr={6}
      visibility='visible'
      onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
    >
      <InputGroup>
        <InputLeftElement pointerEvents='none'>
          <SearchIcon color={useColorModeValue('gray.300', 'gray.750')} />
        </InputLeftElement>
        <Input {...register('search')} type='text' placeholder='Search' pl={10} variant='filled' />
      </InputGroup>
    </Box>
  )
}
