import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Card,
  Flex,
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
import { useCallback, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

import type { RegistryItem } from '../types'
import { PageInput } from './PageInput'

const registryItems: RegistryItem[] = require('../registry.json')

const PAGE_SIZE = 20

export const DappRegistryGrid: FC = () => {
  const translate = useTranslate()
  const { register, setValue, control } = useForm<{ search: string; page: number }>({
    mode: 'onChange',
    defaultValues: { search: '', page: 0 },
  })

  const search = useWatch({ control, name: 'search' })
  const page = useWatch({ control, name: 'page' })
  useEffect(() => setValue('page', 0), [search, setValue])

  const filteredListings = useMemo(
    () =>
      registryItems.filter(
        registryItem => !search || registryItem.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  )

  const handleClick = useCallback((dapp: string) => {
    getMixPanel()?.track(MixPanelEvents.ClickdApp, { dapp })
  }, [])

  const maxPage = Math.floor(filteredListings.length / PAGE_SIZE)

  return (
    <Box px={{ base: 4, xl: 0 }}>
      <Flex
        justifyContent='space-between'
        flexDir={{ base: 'column', md: 'row' }}
        alignItems={{ base: 'flex-start', md: 'center' }}
        mb={4}
        gap={2}
      >
        <Heading flex={1} fontSize='2xl'>
          <Text translation='plugins.walletConnectToDapps.registry.availableDapps' />
        </Heading>
        <Flex
          gap={2}
          flex={1}
          width={{ base: 'full', md: 'auto' }}
          flexDir={{ base: 'column', sm: 'row' }}
        >
          <InputGroup flex={1}>
            <InputLeftElement pointerEvents='none'>
              <SearchIcon color='gray.700' />
            </InputLeftElement>
            <Input
              {...register('search')}
              autoComplete='off'
              type='text'
              placeholder={translate('common.search')}
              pl={10}
              variant='filled'
            />
          </InputGroup>

          <PageInput value={page} max={maxPage} onChange={value => setValue('page', value)} />
        </Flex>
      </Flex>
      {!!filteredListings.length ? (
        <SimpleGrid columns={{ lg: 4, sm: 2, base: 1 }} spacing={4}>
          {filteredListings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(listing => (
            <Link
              key={listing.id}
              href={listing.homepage}
              isExternal
              onClick={() => handleClick(listing.name)}
            >
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
            <SearchIcon color='text.subtle' fontSize='xl' />{' '}
          </Card>
          <Text translation='common.noResultsFound' fontWeight='medium' fontSize='lg' />
          <Text
            translation='plugins.walletConnectToDapps.registry.emptyStateDescription'
            color='text.subtle'
          />
        </VStack>
      )}
    </Box>
  )
}
