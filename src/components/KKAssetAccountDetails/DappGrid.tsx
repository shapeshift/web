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
  useToast,
  VStack,
} from '@chakra-ui/react'
import { PageInput } from 'plugins/walletConnectToDapps/components/PageInput'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { KKAsset } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

export type Dapp = {
  id: string
  homepage: string
  name: string
  author: string
  image: string
  devSignAddress: string
  associatedAsset: {
    assetId: string
    symbol: string
  }
}

const dapps: Dapp[] = require('./dapps.json')

const PAGE_SIZE = 20

export const DappGrid: FC<{ asset: KKAsset }> = ({ asset }) => {
  const { register, setValue, control } = useForm<{ search: string; page: number }>({
    mode: 'onChange',
    defaultValues: { search: '', page: 0 },
  })

  const search = useWatch({ control, name: 'search' })
  const page = useWatch({ control, name: 'page' })
  useEffect(() => setValue('page', 0), [search, setValue])
  const history = useHistory()
  const { dispatch } = useWallet()

  const filteredListings = useMemo(
    () =>
      dapps.filter(
        dapp =>
          (!search || dapp.name.toLowerCase().includes(search.toLowerCase())) &&
          dapp.associatedAsset.assetId === asset.assetId &&
          dapp.associatedAsset.symbol === asset.symbol,
      ),
    [asset.assetId, asset.symbol, search],
  )

  const maxPage = Math.floor(filteredListings.length / PAGE_SIZE)

  const openDapp = (app: Dapp) => {
    dispatch({ type: WalletActions.SET_BROWSER_URL, payload: app.homepage })
    history.push('/browser')
  }

  const toast = useToast()

  const handleCopyClick = useCallback(
    async (app: Dapp) => {
      if (!app.devSignAddress) return
      const duration = 2500
      const isClosable = true
      const toastPayload = { duration, isClosable }
      try {
        await navigator.clipboard.writeText(app.devSignAddress)
        const title = 'Developer signing address copied to clipboard'
        const status = 'success'
        const description = app.devSignAddress
        toast({ description, title, status, ...toastPayload })
      } catch (e) {
        const title = 'Unable to copy'
        const status = 'error'
        const description = 'Copy address failed'
        toast({ description, title, status })
      }
    },
    [toast],
  )

  return (
    <Box>
      <Stack direction='row' alignItems='center' mb={4}>
        <Heading flex={1} fontSize='xl'>
          Dapps that support {asset.symbol}
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
              <Stack direction='column' alignItems='left' spacing={0}>
                <Link key={listing.id} onClick={() => openDapp(listing)}>
                  <Stack direction='row' alignItems='center'>
                    <Image borderRadius='full' boxSize='48px' m={2} src={listing.image} />
                    <PlainText fontWeight='semibold'>{listing.name}</PlainText>
                  </Stack>
                </Link>
                <Stack alignItems='center'>
                  <PlainText color='gray.500' display='inline-flex' fontSize='sm'>
                    Author: {listing.author}
                    {' ('}
                    <MiddleEllipsis
                      color='gray.500'
                      alignItems='center'
                      justifyContent='center'
                      fontSize='sm'
                      onClick={() => handleCopyClick(listing)}
                      _hover={{ color: 'blue.500' }}
                      _active={{ color: 'blue.800' }}
                      cursor='pointer'
                      value={listing.devSignAddress}
                      data-test='receive-address-label'
                    />
                    {')'}
                  </PlainText>
                </Stack>
              </Stack>
            </Box>
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
