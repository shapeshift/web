import { Box, Image, Text } from '@chakra-ui/react'
import type { V2ZapperNft } from 'state/apis/zapper/client'

export const NftCard: React.FC<V2ZapperNft> = props => {
  const { collection, medias, name } = props
  const { floorPriceEth } = collection
  const imageUrl = medias?.[0]?.originalUrl

  return (
    <Box m={4} borderWidth='1px' borderRadius='xl' overflow='hidden' width='150px'>
      <Image src={imageUrl} alt={name} maxHeight='150px' />

      <Box p={4}>
        <Box display='flex' alignItems='baseline'>
          <Text fontWeight='bold' fontSize='xl' mr='2' wordBreak='break-word'>
            {name}
          </Text>
        </Box>

        <Box>
          <Text fontSize='sm' color='gray.500' mb='1'>
            Floor price
          </Text>
          <Text fontSize='lg' fontWeight='bold'>
            {floorPriceEth} ETH
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
