import {
  Box,
  Flex,
  Image,
  Skeleton,
  Tag,
  TagLeftIcon,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import Placeholder from 'assets/placeholder.png'
import PlaceholderDrk from 'assets/placeholder-drk.png'
import { Amount } from 'components/Amount/Amount'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { useModal } from 'hooks/useModal/useModal'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { V2ZapperNft } from 'state/apis/zapper/client'
import { getMediaType } from 'state/apis/zapper/client'

type NftCardProps = {
  zapperNft: V2ZapperNft
}

export const NftCard: React.FC<NftCardProps> = ({ zapperNft }) => {
  const { collection, medias, name, rarityRank } = zapperNft
  const { floorPriceEth } = collection
  const mediaUrl = medias?.[0]?.originalUrl
  const mediaType = getMediaType(mediaUrl)
  const bg = useColorModeValue('gray.50', 'gray.750')
  const bgHover = useColorModeValue('gray.100', 'gray.700')
  const placeholderImage = useColorModeValue(PlaceholderDrk, Placeholder)
  const [imageLoaded, setImageLoaded] = useState(false)

  const { nft } = useModal()

  const handleClick = useCallback(() => {
    nft.open({ zapperNft })

    const mixpanel = getMixPanel()
    const eventData = {
      name: zapperNft.name,
      id: zapperNft.id,
      collectionName: zapperNft.collection.name,
      collectionAddress: zapperNft.collection.address,
      estimatedValueEth: zapperNft.estimatedValueEth,
      collectionFloorPriceEth: zapperNft.collection.floorPriceEth,
      nftMediaUrls: (zapperNft.medias ?? []).map(media => media.originalUrl),
    }

    mixpanel?.track(MixPanelEvents.ClickNft, eventData)
  }, [nft, zapperNft])

  // should take the JSX props below and make them an object instead
  const mediaBoxProps = useMemo(
    () =>
      ({
        objectFit: 'cover',
        className: 'nft-image',
        transitionDuration: '200ms',
        transitionProperty: 'all',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      } as const),
    [],
  )

  return (
    <Box
      as='a'
      cursor='pointer'
      borderRadius='xl'
      overflow='hidden'
      onClick={handleClick}
      bg={bg}
      _hover={{ bg: bgHover }}
      sx={{
        ':hover .nft-image': { transform: 'scale(1.4)' },
        ':hover .rarity-tag': { bg: 'white', color: 'black' },
      }}
      _active={{ transform: 'translateY(2px)' }}
      transitionDuration='100ms'
      transitionProperty='all'
      transitionTimingFunction='cubic-bezier(0.4, 0, 0.2, 1)'
    >
      <Box paddingBottom='100%' position='relative' overflow='hidden'>
        {!mediaUrl || mediaType === 'image' ? (
          <Skeleton
            borderRadius='none'
            isLoaded={imageLoaded}
            position='absolute'
            width='full'
            height='full'
            left={0}
            top={0}
          >
            <Image
              src={mediaUrl ?? placeholderImage}
              alt={name}
              onLoad={() => setImageLoaded(true)}
              {...mediaBoxProps}
            />
          </Skeleton>
        ) : (
          <Box
            as='video'
            src={mediaUrl}
            loop
            // Needed because of chrome autoplay policy: https://developer.chrome.com/blog/autoplay/#new-behaviors
            muted
            autoPlay
            {...mediaBoxProps}
          />
        )}
        {rarityRank && (
          <Tag
            colorScheme='black'
            className='rarity-tag'
            flexShrink={0}
            position='absolute'
            right='0.5rem'
            top='0.5rem'
            backdropFilter='auto'
            backdropBlur='3xl'
            transform='translate3d(0, 0, 0)'
          >
            <TagLeftIcon as={DiamondIcon} />
            {rarityRank}
          </Tag>
        )}
      </Box>
      <Box p={4}>
        <Flex justifyContent='space-between' alignItems='center'>
          <Text fontWeight='bold' fontSize='sm' wordBreak='break-word'>
            {name}
          </Text>
        </Flex>

        <Box>
          <Amount.Crypto
            color='gray.500'
            fontWeight='bold'
            value={floorPriceEth ?? ''}
            symbol='ETH'
          />
        </Box>
      </Box>
    </Box>
  )
}
