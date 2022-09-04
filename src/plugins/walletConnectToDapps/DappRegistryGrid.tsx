import { Box, Image, Link, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { FC } from 'react'

interface RegistryItem {
  category: string
  id: string
  homepage: string
  name: string
  image: string
}

const registry: RegistryItem[] = require('./registry.json')

export const DappRegistryGrid: FC = () => {
  return (
    <SimpleGrid columns={{ lg: 4, sm: 2, base: 1 }} spacing={4}>
      {registry.slice(0, 20).map(listing => (
        <Link key={listing.id} href={listing.homepage} isExternal>
          <Box borderRadius='lg' p={2} position='relative' overflow='hidden'>
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
              <Text fontWeight='semibold'>{listing.name}</Text>
            </Stack>
          </Box>
        </Link>
      ))}
    </SimpleGrid>
  )
}
