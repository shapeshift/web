import { Box, Image, Text } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useModal } from 'hooks/useModal/useModal'
import type { V2ZapperNft } from 'state/apis/zapper/client'

type NftCardProps = {
  zapperNft: V2ZapperNft
}

export const NftCard: React.FC<NftCardProps> = ({ zapperNft }) => {
  const { collection, medias, name } = zapperNft
  const { floorPriceEth } = collection
  const imageUrl = medias?.[0]?.originalUrl

  const { nft } = useModal()

  const handleClick = useCallback(() => nft.open({ zapperNft }), [nft, zapperNft])

  return (
    <Box
      m={4}
      borderWidth='1px'
      borderRadius='xl'
      overflow='hidden'
      width='150px'
      onClick={handleClick}
    >
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
