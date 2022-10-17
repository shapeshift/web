import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Heading,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  SimpleGrid,
  Stack,
  Text as PlainText,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import type { RegistryItem } from '../types'
import { PageInput } from './PageInput'

const registryItems: RegistryItem[] = require('../registry.json')

const PAGE_SIZE = 20

export const DappRegistryGrid: FC = () => {
  const { register, setValue, control } = useForm<{ search: string; page: number }>({
    mode: 'onChange',
    defaultValues: { search: '', page: 0 },
  })

  const search = useWatch({ control, name: 'search' })
  const page = useWatch({ control, name: 'page' })
  useEffect(() => setValue('page', 0), [search, setValue])

  const filteredItems = useMemo(() => registryItems.filter(e => e.category !== 'wallet'), [])

  const filteredListings = useMemo(
    () =>
      filteredItems.filter(
        registryItem => !search || registryItem.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [filteredItems, search],
  )

  const maxPage = Math.floor(filteredListings.length / PAGE_SIZE)

  return (
    <Box>
      <Stack direction='row' alignItems='center' mb={4}>
        <Heading flex={1} fontSize='2xl'>
          <Text translation='plugins.walletConnectToDapps.registry.availableDapps' />
        </Heading>
        <Box>
          <InputGroup>
            <InputLeftElement pointerEvents='none'>
              <SearchIcon color='gray.700' />
            </InputLeftElement>
            <Input
              {...register('search')}
              autoComplete='off'
              type='text'
              placeholder='Search'
              pl={10}
              variant='filled'
            />
          </InputGroup>
        </Box>
        <PageInput value={page} max={maxPage} onChange={value => setValue('page', value)} />
      </Stack>
      {!!filteredListings.length ? (
        <SimpleGrid columns={{ lg: 4, sm: 2, base: 1 }} spacing={4}>
          {filteredListings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(listing => (
            <Link key={listing.id} href={listing.homepage} isExternal>
              <Box
                borderRadius='lg'
                p={2}
                position='relative'
                overflow='hidden'
                _hover={{ opacity: 0.8, transition: 'opacity 0.2s ease-in-out' }}
              >
                <Image
                  src={listing.image}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    filter: 'blur(20px)',
                    opacity: 0.3,
                    zIndex: -1,
                  }}
                />
                <Stack direction='row' alignItems='center'>
                  <Image borderRadius='full' boxSize='48px' m={2} src={listing.image} />
                  <PlainText fontWeight='semibold'>{listing.name}</PlainText>
                </Stack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      ) : (
        <VStack alignItems='center' p={8} spacing={0}>
          <Card
            display='grid'
            width={14}
            height={14}
            placeItems='center'
            borderRadius='2xl'
            borderWidth={0}
            mb={4}
          >
            <SearchIcon color='gray.500' fontSize='xl' />{' '}
          </Card>
          <Text translation='common.noResultsFound' fontWeight='medium' fontSize='lg' />
          <Text
            translation='plugins.walletConnectToDapps.registry.emptyStateDescription'
            color='gray.500'
          />
        </VStack>
      )}
    </Box>
  )
}
