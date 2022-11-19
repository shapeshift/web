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
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getConfig } from 'config'

import type { RegistryItem } from '../types'
import { PageInput } from './PageInput'
// @ts-ignore
import client from '@pioneer-platform/pioneer-client'

const PAGE_SIZE = 20

export const DappRegistryGrid: FC = () => {
  const [registryItems, setRegistryItems] = useState([  {
    "category": "dapp",
    "id": "a85fb60f37b9971969e00caa241ed2b6ccd8fce369f59d3a965202595a4a9462",
    "homepage": "https://gnosis-safe.io/",
    "name": "Gnosis Safe Multisig",
    "image": "https://explorer-api.walletconnect.com/v3/logo/md/0b7e0f05-0a5b-4f3c-315d-59c1c4c22c00?projectId=2f05ae7f1116030fde2d36508f472bfb"
  }])
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
      registryItems.filter(
        registryItem => !search || registryItem.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search,registryItems],
  )


  let findDapps = async function (){
    try{
      let spec = getConfig().REACT_APP_DAPP_URL
      let config = {
        queryKey:'key:public',
        username:"user:public",
        spec
      }
      let pioneer = new client(spec,config)
      pioneer = await pioneer.init()

      let dapps = await pioneer.ListApps()
      console.log("apps: ",dapps.data)
      setRegistryItems(dapps.data)
    }catch(e){
      console.error(' e: ',e)
    }
  }
  useEffect(() => {
    findDapps()
  }, []);

  const maxPage = Math.floor(filteredListings.length / PAGE_SIZE)

  const openDapp = (app: RegistryItem) => {
    dispatch({ type: WalletActions.SET_BROWSER_URL, payload: app.homepage })
    history.push('/browser')
  }

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
            <Link key={listing.id} onClick={() => openDapp(listing)}>
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
